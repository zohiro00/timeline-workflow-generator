import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";

const host = "127.0.0.1";
const port = Number(process.env.UI_CAPTURE_PORT ?? 5173);
const baseUrl = `http://${host}:${port}`;
const outputDir = new URL("../artifacts/ui-captures/", import.meta.url);

const scenarios = [
  {
    name: "engine-desktop",
    path: "/engine",
    viewport: { width: 1440, height: 900 },
    waitFor: async (page) => {
      await page.locator("#preview svg").waitFor({ state: "visible" });
      await page.locator("#status.status.ok").waitFor({ state: "visible" });
    },
  },
];

let devServer;

try {
  await mkdir(outputDir, { recursive: true });
  await ensureDevServer();

  const browser = await chromium.launch();
  try {
    for (const scenario of scenarios) {
      const page = await browser.newPage({ viewport: scenario.viewport });
      await page.goto(`${baseUrl}${scenario.path}`, { waitUntil: "networkidle" });
      await scenario.waitFor(page);
      await page.screenshot({
        path: new URL(`${scenario.name}.png`, outputDir).pathname,
      });
      await page.close();
      console.log(`Captured ${scenario.name}.png`);
    }
  } finally {
    await browser.close();
  }
} finally {
  if (devServer) {
    devServer.kill("SIGTERM");
  }
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
