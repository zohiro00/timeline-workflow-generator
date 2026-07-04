import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import test from "node:test";

const host = "127.0.0.1";
const port = Number(process.env.UI_TEST_PORT ?? 5183);
const baseUrl = `http://${host}:${port}`;

let devServer;
let browser;

test.before(async () => {
  await ensureDevServer();
  browser = await chromium.launch();
});

test.after(async () => {
  await browser?.close();
  devServer?.kill("SIGTERM");
});

test("top page output example communicates the generated SVG result", async () => {
  const page = await openTopPage({ width: 1280, height: 820 });

  assert.match(await page.locator(".hero-badge").textContent(), /Markdown workflow to timeline SVG/);
  assert.match(await page.locator(".hero-title").textContent(), /Markdownから、時系列ワークフロー図を自動生成/);
  assert.equal(await page.locator(".demo-output .block-label").textContent(), "Output SVG");
  await expectLocatorVisible(page.locator(".mini-timeline"));
  await expectLocatorVisible(page.getByText("依存関係から時系列位置を自動整列"));
  assert.deepEqual(await page.locator(".mini-lane-label").evaluateAll((items) => items.map((item) => item.textContent)), [
    "申請",
    "受付",
  ]);
  assert.equal(await page.locator(".mini-arrow").count(), 2);

  await page.close();
});

test("top page output example fits on narrow screens", async () => {
  const page = await openTopPage({ width: 360, height: 740 });
  const overflow = await page.locator(".demo-output").evaluate((item) => item.scrollWidth - item.clientWidth);

  assert.ok(overflow <= 1);

  await page.close();
});

test("engine settings sidebar can be collapsed and reopened", async () => {
  const page = await openEnginePage({ width: 1280, height: 820 });

  const sidebar = page.locator("#settings-sidebar");
  const toggle = page.locator("#settings-toggle");
  await expectSidebarOpen(page);

  await toggle.click();
  await page.waitForFunction(() => document.querySelector(".engine-body")?.classList.contains("sidebar-collapsed"));
  assert.equal(await toggle.getAttribute("aria-expanded"), "false");
  assert.ok((await sidebar.boundingBox()).width < 1);

  await toggle.click();
  await expectSidebarOpen(page);

  await page.close();
});

test("engine settings start with style first and layout groups collapsed", async () => {
  const page = await openEnginePage({ width: 1280, height: 820 });
  const groups = page.locator(".settings-group");

  assert.deepEqual(await groups.evaluateAll((items) => items.map((item) => item.dataset.group)), [
    "style",
    "canvas",
    "nodes",
  ]);
  assert.equal(await page.locator('[data-group="style"] .settings-group-header').getAttribute("aria-expanded"), "true");
  assert.equal(await page.locator('[data-group="canvas"] .settings-group-header').getAttribute("aria-expanded"), "false");
  assert.equal(await page.locator('[data-group="nodes"] .settings-group-header').getAttribute("aria-expanded"), "false");
  await expectLocatorVisible(page.locator('[data-group="style"] .settings-body'));
  await expectLocatorHidden(page.locator('[data-group="canvas"] .settings-body'));
  await expectLocatorHidden(page.locator('[data-group="nodes"] .settings-body'));

  await page.close();
});

test("engine editor starts with markdown workflow only", async () => {
  const page = await openEnginePage({ width: 1280, height: 820 });
  const sourceValue = await page.locator("#source").inputValue();

  assert.ok(sourceValue.startsWith("# 購買申請ワークフロー"));
  assert.doesNotMatch(sourceValue, /```workflow/);
  assert.doesNotMatch(sourceValue, /Markdownの中に workflow ブロック/);

  await page.close();
});

test("engine editor supports markdown assist shortcuts", async () => {
  const page = await openEnginePage({ width: 1280, height: 820 });
  const editor = page.locator("#source");

  await editor.fill("- first");
  await editor.evaluate((item) => item.setSelectionRange(item.value.length, item.value.length));
  await editor.press("Enter");
  assert.equal(await editor.inputValue(), "- first\n- ");

  await page.keyboard.type("second");
  assert.equal(await editor.inputValue(), "- first\n- second");

  await editor.press("Alt+ArrowUp");
  assert.equal(await editor.inputValue(), "- second\n- first");

  await editor.press("Tab");
  assert.equal(await editor.inputValue(), "  - second\n- first");

  await editor.press("Shift+Tab");
  assert.equal(await editor.inputValue(), "- second\n- first");

  await page.close();
});

test("engine workflow examples can be expanded and applied", async () => {
  const page = await openEnginePage({ width: 1280, height: 820 });
  const examples = page.locator(".workflow-example");
  const toggle = page.locator("#examples-toggle");

  assert.equal(await examples.count(), 3);
  await page.getByRole("button", { name: /採用選考/ }).click();
  assert.match(await page.locator("#source").inputValue(), /^# 採用選考ワークフロー/);
  await page.locator("#preview svg title").waitFor({ state: "attached" });
  assert.equal(await page.locator("#preview svg title").textContent(), "採用選考ワークフロー");

  await toggle.click();
  assert.equal(await toggle.getAttribute("aria-expanded"), "false");
  await expectLocatorHidden(examples.first());

  await toggle.click();
  assert.equal(await toggle.getAttribute("aria-expanded"), "true");
  await expectLocatorVisible(examples.first());

  await page.close();
});

test("engine settings can be restored to defaults", async () => {
  const page = await openEnginePage({ width: 1280, height: 820 });
  const gridControl = page.locator('[data-setting="gridXSize"]');
  const nodeControl = page.locator('[data-setting="nodeWidth"]');
  const themeControl = page.locator('[data-setting="themeHint"]');
  const reset = page.locator("#reset-settings");

  await page.locator('[data-group="canvas"] .settings-group-header').click();
  await page.locator('[data-group="nodes"] .settings-group-header').click();
  await gridControl.fill("224");
  await nodeControl.fill("156");
  await themeControl.selectOption("consulting-gray-outline");
  assert.equal(await page.locator("#gridXSize-value").textContent(), "224px");
  assert.equal(await page.locator("#nodeWidth-value").textContent(), "156px");

  await reset.click();
  assert.equal(await gridControl.inputValue(), "188");
  assert.equal(await nodeControl.inputValue(), "112");
  assert.equal(await themeControl.inputValue(), "consulting-blue-outline");
  assert.equal(await page.locator("#gridXSize-value").textContent(), "188px");
  assert.equal(await page.locator("#nodeWidth-value").textContent(), "112px");
  assert.equal(await page.locator("#theme-label").textContent(), "濃い青 / 枠線");
  await page.locator("#status.status.ok").waitFor({ state: "visible" });

  await page.close();
});

test("engine theme preset updates the rendered svg", async () => {
  const page = await openEnginePage({ width: 1280, height: 820 });
  const themeControl = page.locator('[data-setting="themeHint"]');

  assert.equal(await themeControl.inputValue(), "consulting-blue-outline");
  assert.equal(await page.locator("#theme-label").textContent(), "濃い青 / 枠線");
  assert.match(await page.locator("#preview svg style").textContent(), /stroke: #1f4e79/);

  await themeControl.selectOption("consulting-blue-fill");
  assert.equal(await page.locator("#theme-label").textContent(), "濃い青 / 塗りつぶし");
  assert.match(await page.locator("#preview svg style").textContent(), /\.node rect \{ fill: #1f4e79; stroke: #1f4e79;/);
  assert.match(await page.locator("#preview svg style").textContent(), /\.node text \{ fill: #ffffff;/);

  await themeControl.selectOption("consulting-gray-outline");
  assert.equal(await page.locator("#theme-label").textContent(), "灰色 / 枠線");
  assert.match(await page.locator("#preview svg style").textContent(), /stroke: #595959/);

  await themeControl.selectOption("consulting-gray-fill");
  assert.equal(await page.locator("#theme-label").textContent(), "灰色 / 塗りつぶし");
  assert.match(await page.locator("#preview svg style").textContent(), /\.node rect \{ fill: #595959; stroke: #595959;/);
  assert.match(await page.locator("#preview svg style").textContent(), /\.node text \{ fill: #ffffff;/);

  await page.close();
});

test("engine preview fits the rendered svg and supports zoom reset", async () => {
  const page = await openEnginePage({ width: 980, height: 760 });
  const preview = page.locator("#preview");
  const viewport = page.locator(".preview-viewport");
  const zoomIn = page.locator("#preview-zoom-in");
  const reset = page.locator("#preview-zoom-reset");

  const initialMetrics = await readPreviewMetrics(page);
  assert.ok(initialMetrics.viewportWidth <= initialMetrics.availableWidth + 1);
  assert.ok(initialMetrics.viewportHeight <= initialMetrics.availableHeight + 1);
  assert.match(await page.locator("#preview-zoom-value").textContent(), /^\d+%$/);

  await zoomIn.click();
  const zoomedBox = await viewport.boundingBox();
  assert.ok(zoomedBox.width > initialMetrics.viewportWidth);

  await reset.click();
  const resetMetrics = await readPreviewMetrics(page);
  assert.ok(Math.abs(resetMetrics.viewportWidth - initialMetrics.viewportWidth) <= 2);
  assert.ok(Math.abs(resetMetrics.viewportHeight - initialMetrics.viewportHeight) <= 2);
  assert.equal(await reset.isDisabled(), false);
  assert.equal(await preview.locator("svg").count(), 1);

  await page.close();
});

test("engine preview can be maximized across the workspace and restored", async () => {
  const page = await openEnginePage({ width: 1280, height: 820 });
  const workspace = page.locator(".workspace");
  const sourcePane = page.locator(".source-pane");
  const previewPane = page.locator(".preview-pane");
  const resizer = page.locator(".pane-resizer");
  const maximize = page.locator("#preview-maximize-toggle");

  const initialSourceBox = await sourcePane.boundingBox();
  assert.ok(initialSourceBox.width > 200);
  assert.equal(await maximize.getAttribute("aria-pressed"), "false");
  assert.equal(await maximize.getAttribute("aria-label"), "diagramを最大化");

  await maximize.click();
  await page.waitForFunction(() => document.querySelector(".workspace")?.classList.contains("preview-maximized"));
  assert.equal(await maximize.getAttribute("aria-pressed"), "true");
  assert.equal(await maximize.getAttribute("aria-label"), "diagram最大化を解除");
  await expectLocatorHidden(sourcePane);
  await expectLocatorHidden(resizer);

  const maximizedWorkspaceBox = await workspace.boundingBox();
  const maximizedPreviewBox = await previewPane.boundingBox();
  assert.ok(maximizedPreviewBox.width >= maximizedWorkspaceBox.width - 2);
  assert.ok(maximizedPreviewBox.height >= maximizedWorkspaceBox.height - 2);
  assert.equal(await page.locator("#preview svg").count(), 1);

  const maximizedMetrics = await readPreviewMetrics(page);
  assert.ok(maximizedMetrics.viewportWidth <= maximizedMetrics.availableWidth + 2);
  assert.ok(maximizedMetrics.viewportHeight <= maximizedMetrics.availableHeight + 2);

  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector(".workspace")?.classList.contains("preview-maximized"));
  assert.equal(await maximize.getAttribute("aria-pressed"), "false");
  assert.ok((await sourcePane.boundingBox()).width > 200);
  assert.ok((await resizer.boundingBox()).width > 0);

  await maximize.click();
  await page.waitForFunction(() => document.querySelector(".workspace")?.classList.contains("preview-maximized"));
  await maximize.click();
  await page.waitForFunction(() => !document.querySelector(".workspace")?.classList.contains("preview-maximized"));
  assert.equal(await maximize.getAttribute("aria-pressed"), "false");

  await page.close();
});

test("engine panes can be resized horizontally on desktop", async () => {
  const page = await openEnginePage({ width: 1280, height: 820 });
  const sourcePane = page.locator(".source-pane");
  const resizer = page.locator(".pane-resizer");
  const before = await sourcePane.boundingBox();
  const handle = await resizer.boundingBox();

  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + handle.width / 2 + 140, handle.y + handle.height / 2);
  await page.mouse.up();

  const after = await sourcePane.boundingBox();
  assert.ok(after.width > before.width + 80);
  assert.equal(await resizer.getAttribute("aria-orientation"), "vertical");

  await resizer.focus();
  await page.keyboard.press("ArrowLeft");
  const keyboardAfter = await sourcePane.boundingBox();
  assert.ok(keyboardAfter.width < after.width);

  await page.close();
});

test("engine panes can be resized vertically on narrow screens", async () => {
  const page = await openEnginePage({ width: 900, height: 820 });
  const sourcePane = page.locator(".source-pane");
  const resizer = page.locator(".pane-resizer");
  const before = await sourcePane.boundingBox();
  const handle = await resizer.boundingBox();

  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2 + 120);
  await page.mouse.up();

  const after = await sourcePane.boundingBox();
  assert.ok(after.height > before.height + 70);
  assert.equal(await resizer.getAttribute("aria-orientation"), "horizontal");

  await page.close();
});

async function openEnginePage(viewport) {
  const page = await browser.newPage({ viewport });
  await page.goto(`${baseUrl}/engine`, { waitUntil: "domcontentloaded" });
  await page.locator("#preview svg").waitFor({ state: "visible" });
  await page.locator("#status.status.ok").waitFor({ state: "visible" });
  return page;
}

async function openTopPage(viewport) {
  const page = await browser.newPage({ viewport });
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.locator(".demo-output").waitFor({ state: "visible" });
  return page;
}

async function expectSidebarOpen(page) {
  const sidebar = page.locator("#settings-sidebar");
  const toggle = page.locator("#settings-toggle");
  await page.waitForFunction(() => !document.querySelector(".engine-body")?.classList.contains("sidebar-collapsed"));
  assert.equal(await toggle.getAttribute("aria-expanded"), "true");
  assert.ok((await sidebar.boundingBox()).width > 200);
}

async function expectLocatorHidden(locator) {
  const box = await locator.boundingBox();
  assert.equal(box, null);
}

async function expectLocatorVisible(locator) {
  const box = await locator.boundingBox();
  assert.ok(box?.width > 0);
  assert.ok(box?.height > 0);
}

async function readPreviewMetrics(page) {
  return await page.evaluate(() => {
    const preview = document.querySelector("#preview");
    const viewport = document.querySelector(".preview-viewport");
    const styles = getComputedStyle(preview);
    const availableWidth = preview.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
    const availableHeight = preview.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom);
    return {
      availableWidth,
      availableHeight,
      viewportWidth: viewport.getBoundingClientRect().width,
      viewportHeight: viewport.getBoundingClientRect().height,
    };
  });
}

async function ensureDevServer() {
  if (await canReach(baseUrl)) return;

  devServer = spawn(
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    ["exec", "vite", "--host", host, "--port", String(port), "--strictPort"],
    { stdio: "inherit" },
  );

  await waitForServer();
}

async function waitForServer() {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    if (devServer.exitCode !== null) {
      throw new Error(`Dev server exited with code ${devServer.exitCode}`);
    }
    if (await canReach(baseUrl)) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Timed out waiting for ${baseUrl}`);
}

async function canReach(url) {
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), 750);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timerId);
  }
}
