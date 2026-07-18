import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import test from "node:test";

const host = "127.0.0.1";
const port = Number(process.env.UI_TEST_PORT ?? 5183);
const baseUrl = `http://${host}:${port}`;
const vscodeMarketplaceUrl = "https://marketplace.visualstudio.com/items?itemName=zohiro00.timeline-workflow-preview";

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

test("top page output example communicates the generated output result", async () => {
  const page = await openTopPage({ width: 1280, height: 820 });

  assert.match(await page.locator(".hero-badge").textContent(), /Markdown to editable PowerPoint/);
  assert.match(normalizeText(await page.locator(".hero-title").textContent()), /Markdownから、PowerPointで編集できる時系列ワークフロー図を自動生成/);
  assert.equal(await page.locator(".hero .hero-cta").getAttribute("href"), "/engine");
  assert.deepEqual(await page.locator(".demo-block .block-label").evaluateAll((items) => items.map((item) => item.textContent)), [
    "Input",
    "Preview",
  ]);
  const demoLayout = await page.locator(".demo-flow").evaluate((flow) => {
    const [inputBlock, outputBlock] = flow.querySelectorAll(".demo-block");
    const [inputLabel, outputLabel] = flow.querySelectorAll(".block-label");
    const inputRect = inputBlock.getBoundingClientRect();
    const outputRect = outputBlock.getBoundingClientRect();
    const inputLabelRect = inputLabel.getBoundingClientRect();
    const outputLabelRect = outputLabel.getBoundingClientRect();
    return {
      blockHeightDelta: Math.abs(inputRect.height - outputRect.height),
      labelTopDelta: Math.abs(inputLabelRect.top - outputLabelRect.top),
    };
  });
  assert.ok(demoLayout.blockHeightDelta <= 1);
  assert.ok(demoLayout.labelTopDelta <= 1);
  assert.deepEqual(await page.locator(".demo-flow .demo-block:not(.demo-output) code").evaluateAll((items) => items.map((item) => item.textContent)), [
    "## lanes",
    "- req: 申請",
    "- desk: 受付",
    "## nodes",
    "- req",
    "  - a1: 作成",
    "  - a2: 承認",
    "- desk",
    "  - b1: 完了",
    "## workflow",
    "- a1 -> a2 -.-> b1",
  ]);
  await expectLocatorVisible(page.locator(".mini-timeline"));
  await expectLocatorVisible(page.getByText("依存関係から時系列位置を自動整列"));
  assert.deepEqual(await page.locator(".mini-lane-label").evaluateAll((items) => items.map((item) => item.textContent)), [
    "申請",
    "受付",
  ]);
  assert.deepEqual(await page.locator(".mini-node-label").evaluateAll((items) => items.map((item) => item.textContent)), [
    "作成",
    "承認",
    "完了",
  ]);
  assert.doesNotMatch(await page.locator(".mini-timeline").textContent(), /差戻|待機/);
  assert.equal(await page.locator(".mini-arrow").count(), 2);
  assert.deepEqual(await page.locator(".output-format").evaluateAll((items) => items.map((item) => item.textContent.trim())), [
    "Editable PPTX",
    "SVG",
    "PNG",
    "画像をコピー",
  ]);

  await page.close();
});

test("top page follows the planned information architecture", async () => {
  const page = await openTopPage({ width: 1280, height: 1200 });

  assert.deepEqual(await page.locator("main > section").evaluateAll((sections) => sections.map((section) => section.className)), [
    "hero",
    "narrative-section problem-section",
    "narrative-section solution-section",
    "features",
    "steps",
    "use-cases",
    "faq",
    "final-cta",
  ]);
  assert.match(await page.locator("#problem-title").textContent(), /図形を動かすたびに/);
  assert.match(await page.locator("#solution-title").textContent(), /依存関係から時系列を自動でそろえる/);
  assert.deepEqual(await page.locator(".feature-card h3").evaluateAll((items) => items.map((item) => item.textContent)), [
    "Markdownで素早く編集",
    "プレビューで自動整列",
    "PowerPointで編集できるPPTX",
  ]);
  assert.deepEqual(await page.locator(".step-card h3").evaluateAll((items) => items.map((item) => item.textContent)), [
    "Markdownを書く",
    "プレビューで確認",
    "PPTX / SVG / PNGで出力",
  ]);
  assert.deepEqual(await page.locator(".use-case-card h3").evaluateAll((items) => items.map((item) => item.textContent)), [
    "稟議・申請",
    "購買・発注",
    "障害対応・開発工程",
  ]);
  assert.deepEqual(await page.locator(".faq-item summary").evaluateAll((items) => items.map((item) => item.textContent)), [
    "PowerPointで使えますか？",
    "Markdown本文から抽出できますか？",
    "座標を手で調整する必要はありますか？",
    "登録なしで試せますか？",
  ]);
  assert.equal(await page.locator(".final-cta .hero-cta").getAttribute("href"), "/engine");
  assert.equal(await page.getByText("無料登録").count(), 0);
  assert.equal(await page.getByText("利用者の声").count(), 0);
  assert.equal(await page.getByText("SVGを保存").count(), 0);
  assert.equal(await page.getByText("SVGとして保存").count(), 0);
  assert.match(await page.locator(".faq-item").first().textContent(), /ノード図形とコネクタをPowerPoint上で編集/);

  await page.close();
});

test("top page offers Marketplace access without replacing the Web Engine CTA", async () => {
  const page = await openTopPage({ width: 1280, height: 820 });

  assert.equal(await page.locator(".hero .hero-cta").getAttribute("href"), "/engine");

  const heroMarketplaceLink = page.locator(".hero-marketplace-cta");
  assert.equal(await heroMarketplaceLink.locator("span").textContent(), "VS Codeでライブプレビュー");
  assert.equal(await heroMarketplaceLink.getAttribute("href"), vscodeMarketplaceUrl);
  assert.equal(await heroMarketplaceLink.getAttribute("target"), "_blank");
  assert.match(await heroMarketplaceLink.getAttribute("rel"), /noopener/);

  const footerMarketplaceLink = page.locator(".site-footer a", { hasText: "VS Code拡張" });
  assert.equal(await footerMarketplaceLink.getAttribute("href"), vscodeMarketplaceUrl);
  assert.equal(await footerMarketplaceLink.getAttribute("target"), "_blank");
  assert.match(await footerMarketplaceLink.getAttribute("rel"), /noopener/);

  await page.close();
});

test("top page keeps Japanese key phrases from awkward line breaks", async () => {
  const page = await openTopPage({ width: 1280, height: 820 });

  assert.equal(await page.locator(".hero-title-accent").textContent(), "時系列ワークフロー図");
  assert.equal(await page.locator(".hero-title-tail").textContent(), "を自動生成");
  const protectedPhrases = await page.locator(".no-break").evaluateAll((items) =>
    items.map((item) => {
      const rect = item.getBoundingClientRect();
      const parentRect = item.parentElement.getBoundingClientRect();
      const style = getComputedStyle(item);
      return {
        text: item.textContent,
        whiteSpace: style.whiteSpace,
        fitsParent: rect.width <= parentRect.width + 1,
      };
    }),
  );

  assert.ok(protectedPhrases.length >= 6);
  for (const phrase of protectedPhrases) {
    assert.equal(phrase.whiteSpace, "nowrap", phrase.text);
    assert.equal(phrase.fitsParent, true, phrase.text);
  }

  await page.close();
});

test("top page output example fits on narrow screens", async () => {
  const page = await openTopPage({ width: 360, height: 740 });
  const layout = await page.evaluate(() => {
    const badge = document.querySelector(".hero-badge");
    const protectedPhrases = [...document.querySelectorAll(".hero .no-break")];
    return {
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      badgeWhiteSpace: getComputedStyle(badge).whiteSpace,
      protectedPhrasesFit: protectedPhrases.every((item) => item.getBoundingClientRect().width <= item.parentElement.getBoundingClientRect().width + 1),
      marketplaceLinkVisible: document.querySelector(".hero-marketplace-cta")?.getBoundingClientRect().height > 0,
    };
  });

  assert.ok(layout.pageOverflow <= 1);
  assert.equal(layout.badgeWhiteSpace, "nowrap");
  assert.equal(layout.protectedPhrasesFit, true);
  assert.equal(layout.marketplaceLinkVisible, true);

  await page.close();
});

test("top page renders complete English copy without horizontal overflow", async () => {
  const page = await openTopPage({ width: 390, height: 844 }, "en");
  assert.doesNotMatch(await page.locator("main").textContent(), /[ぁ-んァ-ヶ一-龠々ー]/);
  assert.match(normalizeText(await page.locator(".hero-title").textContent()), /TurnMarkdownintoaneditablePowerPoint/);
  assert.equal(await page.locator("html").getAttribute("lang"), "en");
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
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

test("engine syntax guide explains every accepted connection without changing the workflow", async () => {
  const page = await openEnginePage({ width: 1280, height: 820 });
  const source = page.locator("#source");
  const sourceBefore = await source.inputValue();
  const previewBefore = await page.locator("#preview svg").innerHTML();
  const guideToggle = page.locator("#syntax-guide-toggle");
  const guide = page.locator("#syntax-guide");

  assert.equal(await page.locator(".activity #syntax-guide-toggle").count(), 1);
  assert.equal(await page.locator(".source-toolbar-actions #syntax-guide-toggle").count(), 0);
  await guideToggle.click();

  assert.equal(await guideToggle.getAttribute("aria-expanded"), "true");
  assert.equal(await page.locator("#settings-toggle").getAttribute("aria-expanded"), "false");
  await expectLocatorVisible(guide);
  await expectLocatorHidden(page.locator("#settings-panel-view"));
  assert.deepEqual(await guide.locator(".syntax-guide-edge > code").allTextContents(), [
    "a -> b",
    "a -.-> b",
    "a -.- b",
    "a -x- b",
    "a .x. b",
    "a ~> b",
  ]);
  assert.match(await guide.locator(".syntax-guide-edge").last().textContent(), /線を描かず、bをaより後に配置します/);
  assert.equal(await source.inputValue(), sourceBefore);
  assert.equal(await page.locator("#preview svg").innerHTML(), previewBefore);

  await page.locator("#settings-toggle").click();
  await expectLocatorHidden(guide);
  await expectLocatorVisible(page.locator("#settings-panel-view"));
  assert.equal(await page.locator("#settings-toggle").getAttribute("aria-expanded"), "true");

  await guideToggle.click();
  await guideToggle.click();
  assert.equal(await guideToggle.getAttribute("aria-expanded"), "false");
  assert.equal(await page.locator(".engine-body").getAttribute("class"), "engine-body sidebar-collapsed");
  await page.close();
});

test("engine syntax guide localizes its content and reference link", async () => {
  const page = await openEnginePage({ width: 1280, height: 820 }, "en");
  await page.locator("#syntax-guide-toggle").click();
  const guide = page.locator("#syntax-guide");

  assert.doesNotMatch(await guide.textContent(), /[ぁ-んァ-ヶ一-龠々ー]/);
  assert.match(await guide.textContent(), /Draws no line and places b after a on the timeline/);
  assert.match(await page.locator("#syntax-guide-reference").getAttribute("href"), /docs\/dsl\.en\.md$/);
  assert.equal(await page.locator("#syntax-guide-toggle").getAttribute("aria-label"), "Syntax guide");
  assert.equal(await page.locator("#syntax-guide-close").getAttribute("aria-label"), "Close syntax guide");
  await page.close();
});

test("engine syntax guide opens as a keyboard-accessible mobile overlay", async () => {
  const page = await openEnginePage({ width: 390, height: 844 });
  const guideToggle = page.locator("#syntax-guide-toggle");
  const sidebar = page.locator("#settings-sidebar");
  const reference = page.locator("#syntax-guide-reference");

  await guideToggle.click();
  const box = await sidebar.boundingBox();
  assert.equal(await sidebar.getAttribute("role"), "dialog");
  assert.equal(await sidebar.getAttribute("aria-modal"), "true");
  assert.ok(box.x >= 0);
  assert.ok(box.x + box.width <= 390);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);

  await reference.focus();
  await page.keyboard.press("Tab");
  assert.equal(await page.locator("#syntax-guide-close").evaluate((element) => element === document.activeElement), true);
  await page.keyboard.press("Escape");
  await expectLocatorHidden(sidebar);
  assert.equal(await guideToggle.evaluate((element) => element === document.activeElement), true);

  await guideToggle.click();
  await page.locator("#syntax-guide-backdrop").click({ position: { x: 2, y: 2 } });
  await expectLocatorHidden(sidebar);
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

test("engine can hide timeline step labels from canvas settings", async () => {
  const page = await openEnginePage({ width: 1280, height: 820 });
  const timeLabelControl = page.locator('[data-setting="showTimeLabels"]');

  await page.locator('[data-group="canvas"] .settings-group-header').click();
  assert.equal(await timeLabelControl.isChecked(), true);
  assert.equal(await page.locator("#preview svg .time-label").first().textContent(), "ステップ 1");
  assert.equal(await page.locator("#preview svg").evaluate((svg) => svg.textContent.includes("T0")), false);

  await timeLabelControl.uncheck();
  await page.locator("#status.status.ok").waitFor({ state: "visible" });
  assert.equal(await page.locator("#preview svg .time-label").count(), 0);
  assert.ok(await page.locator("#preview svg .time-line").count() > 0);

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

test("engine starter callout appears for the untouched sample and hides after editing", async () => {
  const page = await openEnginePage({ width: 1280, height: 820 });
  const callout = page.locator("#starter-callout");

  await expectLocatorVisible(callout);
  assert.match(await callout.textContent(), /雛形から始める/);

  await page.locator("#source").fill("# 自分のワークフロー");
  await expectLocatorHidden(callout);

  await page.close();
});

test("engine reset button starts from the starter workflow template", async () => {
  const page = await openEnginePage({ width: 1280, height: 820 });
  const reset = page.getByRole("button", { name: "雛形から始める" });

  assert.equal(await reset.getAttribute("data-tooltip"), "雛形から始める");
  await reset.click();
  assert.equal(await page.locator("#source").inputValue(), `# ワークフロー名

## lanes
- lane1: レーン1
- lane2: レーン2

## nodes
- lane1
  - node1: ノード1
- lane2
  - node2: ノード2

## workflow
- node1 -> node2`);
  await page.locator("#preview svg title").waitFor({ state: "attached" });
  assert.equal(await page.locator("#preview svg title").textContent(), "ワークフロー名");
  await expectLocatorHidden(page.locator("#starter-callout"));

  await page.close();
});

test("engine keeps the last successful preview visible while showing input errors", async () => {
  const page = await openEnginePage({ width: 1280, height: 820 });
  const editor = page.locator("#source");
  const reset = page.getByRole("button", { name: "雛形から始める" });
  const staleNotice = page.locator(".stale-preview-notice");
  const exportToggle = page.locator("#export-menu-toggle");
  const validSource = `# ワークフロー名

## lanes
- lane1: レーン1
- lane2: レーン2

## nodes
- lane1
  - node1: ノード1
- lane2
  - node2: ノード2

## workflow
- node1 -> node2`;
  const invalidSource = `# ワークフロー名

## lanes
- lane1: レーン1
- lane2: レーン2
-

## nodes
- lane1
  - node1: ノード1
  -
- lane2
  - node2: ノード2

## workflow
- node1 -> node2
- `;

  await reset.click();
  await page.locator("#preview svg title").waitFor({ state: "attached" });
  assert.equal(await page.locator("#preview svg title").textContent(), "ワークフロー名");
  assert.equal(await exportToggle.isDisabled(), false);

  await editor.fill(invalidSource);
  await page.locator("#status.status.error").waitFor({ state: "visible" });
  assert.match(await page.locator("#status").textContent(), /Line 6: レーンは `- laneId: レーン名` の形式で記述してください。/);
  assert.equal(await page.locator("#status-summary").textContent(), "プレビューを更新できませんでした");
  assert.equal(await page.locator("#preview svg").count(), 1);
  assert.equal(await page.locator("#preview svg title").textContent(), "ワークフロー名");
  assert.equal(await staleNotice.textContent(), "入力にエラーがあります。前回成功時のプレビューを表示しています。");
  assert.equal(await exportToggle.isDisabled(), true);

  await editor.fill(validSource);
  await page.locator("#status.status.ok").waitFor({ state: "visible" });
  await staleNotice.waitFor({ state: "detached" });
  assert.equal(await page.locator("#status-summary").textContent(), "プレビューを更新しました");
  assert.equal(await exportToggle.isDisabled(), false);

  await page.close();
});

test("engine export menu lives in the preview toolbar and closes accessibly", async () => {
  const page = await openEnginePage({ width: 1280, height: 820 });
  const exportToggle = page.locator("#export-menu-toggle");
  const exportMenu = page.locator("#export-menu-list");

  assert.equal(await page.locator(".activity #download-svg").count(), 0);
  assert.equal(await exportToggle.isDisabled(), false);
  assert.equal((await exportToggle.textContent()).trim(), "出力");

  await exportToggle.click();
  assert.equal(await exportToggle.getAttribute("aria-expanded"), "true");
  assert.deepEqual(await exportMenu.locator(".export-menu-item").evaluateAll((items) => items.map((item) => item.textContent)), [
    "画像をコピー",
    "PNGでダウンロード",
    "PPTXでダウンロード",
    "SVGでダウンロード",
  ]);

  await page.keyboard.press("Escape");
  assert.equal(await exportToggle.getAttribute("aria-expanded"), "false");
  await expectLocatorHidden(exportMenu);

  await exportToggle.click();
  await page.locator("#status").click();
  assert.equal(await exportToggle.getAttribute("aria-expanded"), "false");

  await page.close();
});

test("engine export menu downloads svg, png, and pptx files", async () => {
  const page = await openEnginePage({ width: 1280, height: 820 });
  const exportToggle = page.locator("#export-menu-toggle");
  const timestampedFilenamePattern = /^workflow-\d{8}-\d{6}\.(svg|png|pptx)$/;

  await exportToggle.click();
  const [svgDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("menuitem", { name: "SVGでダウンロード" }).click(),
  ]);
  assert.match(svgDownload.suggestedFilename(), timestampedFilenamePattern);
  assert.equal(svgDownload.suggestedFilename().endsWith(".svg"), true);
  assert.equal(await page.locator("#export-menu-list").isHidden(), true);

  await exportToggle.click();
  const [pngDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("menuitem", { name: "PNGでダウンロード" }).click(),
  ]);
  assert.match(pngDownload.suggestedFilename(), timestampedFilenamePattern);
  assert.equal(pngDownload.suggestedFilename().endsWith(".png"), true);
  assert.equal(await pngDownload.failure(), null);
  assert.equal(await page.locator("#status-summary").textContent(), "PNGをダウンロードしました");

  await exportToggle.click();
  const [pptxDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("menuitem", { name: "PPTXでダウンロード" }).click(),
  ]);
  assert.match(pptxDownload.suggestedFilename(), timestampedFilenamePattern);
  assert.equal(pptxDownload.suggestedFilename().endsWith(".pptx"), true);
  assert.equal(await pptxDownload.failure(), null);
  assert.equal(await page.locator("#status-summary").textContent(), "PPTXをダウンロードしました");

  await page.close();
});

test("engine export menu copies the rendered png image", async () => {
  const page = await openEnginePage({ width: 1280, height: 820 });
  await page.evaluate(() => {
    Object.defineProperty(window, "ClipboardItem", {
      configurable: true,
      value: class ClipboardItemMock {
        constructor(items) {
          this.items = items;
        }
      },
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        write: async (items) => {
          const blob = Object.values(items[0].items)[0];
          window.__clipboardWrite = {
            itemCount: items.length,
            size: blob.size,
            type: blob.type,
          };
        },
      },
    });
  });

  await page.locator("#export-menu-toggle").click();
  await page.getByRole("menuitem", { name: "画像をコピー" }).click();

  const clipboardWrite = await page.waitForFunction(() => window.__clipboardWrite).then((handle) => handle.jsonValue());
  assert.deepEqual({
    itemCount: clipboardWrite.itemCount,
    type: clipboardWrite.type,
  }, {
    itemCount: 1,
    type: "image/png",
  });
  assert.ok(clipboardWrite.size > 0);
  assert.equal(await page.locator("#status-summary").textContent(), "画像をコピーしました");

  await page.close();
});

test("engine export menu reports unsupported image copy", async () => {
  const page = await openEnginePage({ width: 1280, height: 820 });
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {},
    });
  });

  await page.locator("#export-menu-toggle").click();
  await page.getByRole("menuitem", { name: "画像をコピー" }).click();

  assert.equal(await page.locator("#status-summary").textContent(), "出力に失敗しました");
  assert.match(await page.locator("#status").textContent(), /画像コピーに対応していません/);
  assert.equal(await page.locator("#export-menu-list").isHidden(), true);

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

test("engine editor searches and replaces literal text from a VS Code-style panel", async () => {
  const page = await openEnginePage({ width: 1280, height: 820 });
  const editor = page.locator("#source");
  const searchPanel = page.locator("#editor-search-panel");

  await editor.fill("lane1 -> lane2 -> lane1");
  await page.locator("#editor-search-toggle").click();
  await expectLocatorVisible(searchPanel);
  await page.locator("#editor-search-input").fill("lane1");
  assert.equal(await page.locator("#editor-search-input").evaluate((item) => document.activeElement === item), true);
  assert.equal(await page.locator("#editor-search-count").textContent(), "1 / 2");

  await page.locator("#editor-search-next").click();
  assert.equal(await page.locator("#editor-search-count").textContent(), "2 / 2");
  await page.locator("#editor-replace-toggle").click();
  await page.locator("#editor-replace-input").fill("requester");
  await page.locator("#editor-replace-one").click();
  assert.equal(await editor.inputValue(), "lane1 -> lane2 -> requester");
  assert.equal(await page.locator("#editor-search-count").textContent(), "1 / 1");

  await page.locator("#editor-replace-all").click();
  assert.equal(await editor.inputValue(), "requester -> lane2 -> requester");
  assert.equal(await page.locator("#editor-search-count").textContent(), "該当なし");
  assert.equal(await page.locator("#status-summary").textContent(), "1件置換しました");

  await page.keyboard.press(process.platform === "darwin" ? "Meta+z" : "Control+z");
  assert.equal(await editor.inputValue(), "lane1 -> lane2 -> requester");

  await page.keyboard.press("Escape");
  await expectLocatorHidden(searchPanel);
  await page.close();
});

test("engine editor formats workflow text only when requested", async () => {
  const page = await openEnginePage({ width: 1280, height: 820 });
  const editor = page.locator("#source");

  await editor.fill("##   workflow\n- draft-->done  ");
  assert.equal(await editor.inputValue(), "##   workflow\n- draft-->done  ");
  await page.locator("#format-source").click();
  assert.equal(await editor.inputValue(), "## workflow\n- draft --> done");
  assert.equal(await page.locator("#status-summary").textContent(), "入力を整形しました");

  await page.close();
});

test("engine workflow examples can be expanded and applied", async () => {
  const page = await openEnginePage({ width: 1280, height: 820 });
  const examples = page.locator(".workflow-example");
  const toggle = page.locator("#examples-toggle");

  assert.equal(await examples.count(), 4);
  assert.equal(await toggle.getAttribute("aria-expanded"), "true");
  await expectLocatorVisible(examples.first());
  await page.getByRole("button", { name: /購買申請/ }).click();
  assert.match(await page.locator("#source").inputValue(), /^# 購買申請ワークフロー/);
  await page.locator("#preview svg title").waitFor({ state: "attached" });
  assert.equal(await page.locator("#preview svg title").textContent(), "購買申請ワークフロー");
  await expectLocatorHidden(page.locator("#starter-callout"));

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

test("engine editor and workflow examples do not overlap on mobile screens", async () => {
  const page = await openEnginePage({ width: 390, height: 844 });
  const editor = page.locator("#source");
  const toggle = page.locator("#examples-toggle");
  const exampleButtons = page.locator(".workflow-example");
  const example = exampleButtons.first();
  const examples = page.locator(".workflow-examples");

  assert.equal(await exampleButtons.count(), 4);
  assert.equal(await toggle.getAttribute("aria-expanded"), "false");
  await expectLocatorHidden(example);
  await toggle.click();
  assert.equal(await toggle.getAttribute("aria-expanded"), "true");

  const editorBox = await editor.boundingBox();
  const examplesBox = await examples.boundingBox();

  assert.ok(editorBox.height >= 180);
  assert.ok(editorBox.y + editorBox.height <= examplesBox.y + 1);
  assert.equal(await page.locator(".source-pane").evaluate((pane) => pane.scrollHeight > pane.clientHeight), true);

  await editor.fill("# mobile input\n\n## workflow");
  assert.match(await editor.inputValue(), /^# mobile input/);
  assert.ok((await example.boundingBox())?.height > 0);

  await page.close();
});

test("engine settings can be restored to defaults", async () => {
  const page = await openEnginePage({ width: 1280, height: 820 });
  const gridControl = page.locator('[data-setting="gridXSize"]');
  const nodeControl = page.locator('[data-setting="nodeWidth"]');
  const themeControl = page.locator('[data-setting="themeHint"]');
  const timeLabelControl = page.locator('[data-setting="showTimeLabels"]');
  const labelFitControl = page.locator('[data-setting="labelFitStrategy"]');
  const reset = page.locator("#reset-settings");

  await page.locator('[data-group="canvas"] .settings-group-header').click();
  await page.locator('[data-group="nodes"] .settings-group-header').click();
  await gridControl.fill("224");
  await nodeControl.fill("156");
  await themeControl.selectOption("consulting-gray-outline");
  await timeLabelControl.uncheck();
  await labelFitControl.selectOption("shrink-first");
  assert.equal(await page.locator("#gridXSize-value").textContent(), "224px");
  assert.equal(await page.locator("#nodeWidth-value").textContent(), "156px");

  await reset.click();
  assert.equal(await gridControl.inputValue(), "188");
  assert.equal(await nodeControl.inputValue(), "112");
  assert.equal(await themeControl.inputValue(), "consulting-blue-outline");
  assert.equal(await timeLabelControl.isChecked(), true);
  assert.equal(await labelFitControl.inputValue(), "wrap-first");
  assert.equal(await page.locator("#gridXSize-value").textContent(), "188px");
  assert.equal(await page.locator("#nodeWidth-value").textContent(), "112px");
  assert.equal(await page.locator("#theme-label").textContent(), "濃い青 / 枠線");
  await page.locator("#status.status.ok").waitFor({ state: "visible" });

  await page.close();
});

test("engine label fit strategy updates the rendered svg", async () => {
  const page = await openEnginePage({ width: 1280, height: 820 });
  const labelFitControl = page.locator('[data-setting="labelFitStrategy"]');
  const source = `# Label fit

## lanes
- main: Main

## nodes
- main
  - a: ABCDEFGHIJKL
  - b: Done

## workflow
- a -> b`;

  await page.locator('[data-group="nodes"] .settings-group-header').click();
  assert.equal(await labelFitControl.inputValue(), "wrap-first");
  assert.deepEqual(await labelFitControl.locator("option").evaluateAll((items) => items.map((item) => item.textContent)), [
    "自動改行を優先",
    "文字縮小を優先",
  ]);

  await page.locator("#source").fill(source);
  await page.waitForFunction(() => document.querySelector("#preview svg title")?.textContent === "Label fit");
  assert.equal(await page.locator("#preview .node text").first().getAttribute("font-size"), "14");

  await labelFitControl.selectOption("shrink-first");
  await page.waitForFunction(() => document.querySelector("#preview .node text")?.getAttribute("font-size") === "12");
  assert.equal(await page.locator("#preview .node text").first().textContent(), "ABCDEFGHIJKL");

  await page.close();
});

test("engine applies the calculated font size to multiline node labels", async () => {
  const page = await openEnginePage({ width: 1280, height: 820 });
  const source = `# Multiline label fit

## lanes
- main: Main

## nodes
- main
  - a: ABCDEFGHIJKL<br>MNOPQRSTUVWX
  - b: Done

## workflow
- a -> b`;

  await page.locator("#source").fill(source);
  await page.waitForFunction(() => document.querySelector("#preview svg title")?.textContent === "Multiline label fit");

  const nodeLabel = page.locator("#preview .node text").first();
  assert.equal(await nodeLabel.getAttribute("font-size"), "12");
  assert.equal(await nodeLabel.evaluate((element) => getComputedStyle(element).fontSize), "12px");
  assert.equal(await nodeLabel.locator("tspan").count(), 2);

  await page.close();
});

test("engine theme preset updates the rendered svg", async () => {
  const page = await openEnginePage({ width: 1280, height: 820 });
  const themeControl = page.locator('[data-setting="themeHint"]');

  assert.equal(await themeControl.inputValue(), "consulting-blue-outline");
  assert.equal(await page.locator("#theme-label").textContent(), "濃い青 / 枠線");
  assert.match(await page.locator("#preview svg style").textContent(), /stroke: #1f4e79/);

  await themeControl.selectOption("consulting-blue-fill");
  await waitForThemeLabel(page, "濃い青 / 塗りつぶし");
  assert.equal(await page.locator("#theme-label").textContent(), "濃い青 / 塗りつぶし");
  assert.match(await page.locator("#preview svg style").textContent(), /\.node rect \{ fill: #1f4e79; stroke: #1f4e79;/);
  assert.match(await page.locator("#preview svg style").textContent(), /\.node text \{ fill: #ffffff;/);

  await themeControl.selectOption("consulting-gray-outline");
  await waitForThemeLabel(page, "灰色 / 枠線");
  assert.equal(await page.locator("#theme-label").textContent(), "灰色 / 枠線");
  assert.match(await page.locator("#preview svg style").textContent(), /stroke: #595959/);

  await themeControl.selectOption("consulting-gray-fill");
  await waitForThemeLabel(page, "灰色 / 塗りつぶし");
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
  assert.equal(await maximize.getAttribute("data-icon-state"), "maximize");
  const initialIconPath = await maximize.locator("path").first().getAttribute("d");

  await maximize.click();
  await page.waitForFunction(() => document.querySelector(".workspace")?.classList.contains("preview-maximized"));
  assert.equal(await maximize.getAttribute("aria-pressed"), "true");
  assert.equal(await maximize.getAttribute("aria-label"), "diagram最大化を解除");
  assert.equal(await maximize.getAttribute("data-icon-state"), "restore");
  assert.notEqual(await maximize.locator("path").first().getAttribute("d"), initialIconPath);
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
  assert.equal(await maximize.getAttribute("data-icon-state"), "maximize");
  assert.equal(await maximize.locator("path").first().getAttribute("d"), initialIconPath);
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

test("switches the Engine to English without replacing the current workflow", async () => {
  const page = await openEnginePage({ width: 1280, height: 820 });
  const source = page.locator("#source");
  const homeLink = page.locator(".titlebar-brand");
  const customSource = `# My workflow

## lanes
- main: Main

## nodes
- main
  - start: Start
  - done: Done

## workflow
- start -> done`;
  await source.fill(customSource);
  assert.equal(await homeLink.getAttribute("href"), "/");
  assert.equal(await homeLink.getAttribute("aria-label"), "トップへ");
  assert.equal(await homeLink.getAttribute("title"), "トップへ");
  assert.equal(await page.locator('.titlebar-nav > a[href="/"]').count(), 0);
  await homeLink.focus();
  assert.notEqual(await homeLink.evaluate((link) => getComputedStyle(link).outlineStyle), "none");
  const localeToggle = page.locator(".locale-menu-toggle");
  assert.equal(await localeToggle.getAttribute("aria-label"), "言語を変更");
  assert.equal(await localeToggle.locator("svg").evaluate((icon) => getComputedStyle(icon).backgroundColor), "rgba(0, 0, 0, 0)");
  await localeToggle.click();
  const localeMenu = page.locator(".locale-menu-list");
  assert.equal(await localeMenu.getAttribute("aria-label"), "言語を変更");
  assert.equal(await localeToggle.getAttribute("aria-expanded"), "true");
  assert.equal(await page.getByRole("menuitemradio", { name: "日本語" }).getAttribute("aria-checked"), "true");
  await page.keyboard.press("Escape");
  await expectLocatorHidden(localeMenu);

  await localeToggle.click();
  await page.getByRole("menuitemradio", { name: "English" }).click();

  assert.equal(await source.inputValue(), customSource);
  assert.equal(await page.locator("html").getAttribute("lang"), "en");
  assert.equal(await homeLink.getAttribute("aria-label"), "Home");
  assert.equal(await homeLink.getAttribute("title"), "Home");
  assert.equal(await localeToggle.getAttribute("aria-label"), "Change language");
  assert.equal(await page.locator('[data-locale="en"]').getAttribute("aria-checked"), "true");
  await expectLocatorHidden(localeMenu);
  assert.equal((await page.locator("#export-menu-toggle").textContent()).trim(), "Export");
  assert.equal(await page.locator("#preview svg .time-label").first().textContent(), "Step 1");
  assert.equal(await page.evaluate(() => localStorage.getItem("timeline-workflow.locale")), "en");
  await page.close();
});

test("language menu fits and remains tappable on mobile screens", async () => {
  const page = await openEnginePage({ width: 390, height: 844 });
  const localeToggle = page.getByRole("button", { name: "言語を変更" });
  const box = await localeToggle.boundingBox();

  assert.ok(box.height >= 34);
  assert.ok(box.width >= 34);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);

  await localeToggle.click();
  const localeMenu = page.locator(".locale-menu-list");
  const menuBox = await localeMenu.boundingBox();
  assert.ok(menuBox.x >= 0);
  assert.ok(menuBox.x + menuBox.width <= 390);
  await page.getByRole("menuitemradio", { name: "English" }).click();
  assert.equal(await page.locator("html").getAttribute("lang"), "en");
  await page.close();
});

async function openEnginePage(viewport, locale = "ja") {
  const page = await browser.newPage({ viewport });
  await page.addInitScript((selectedLocale) => localStorage.setItem("timeline-workflow.locale", selectedLocale), locale);
  await page.goto(`${baseUrl}/engine`, { waitUntil: "domcontentloaded" });
  await page.locator("#preview svg").waitFor({ state: "visible" });
  await page.locator("#status.status.ok").waitFor({ state: "visible" });
  return page;
}

async function openTopPage(viewport, locale = "ja") {
  const page = await browser.newPage({ viewport });
  await page.addInitScript((selectedLocale) => localStorage.setItem("timeline-workflow.locale", selectedLocale), locale);
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

function normalizeText(value) {
  return value.replace(/\s+/g, "");
}

async function waitForThemeLabel(page, label) {
  await page.waitForFunction(
    (expectedLabel) => document.querySelector("#theme-label")?.textContent === expectedLabel,
    label,
  );
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
