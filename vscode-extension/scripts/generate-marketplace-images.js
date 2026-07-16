import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { layoutWorkflow, parseWorkflow, renderWorkflowSvg } from "../../src/workflow.js";

const imagesDirectory = fileURLToPath(new URL("../images/", import.meta.url));
await mkdir(imagesDirectory, { recursive: true });

const browser = await chromium.launch();
try {
  await createIcon(browser);
  await createPreview(browser);
} finally {
  await browser.close();
}

async function createIcon(browserInstance) {
  const page = await browserInstance.newPage({ viewport: { width: 256, height: 256 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; width: 256px; height: 256px; overflow: hidden; background: #102a43; }
      .mark { position: relative; width: 100%; height: 100%; }
      .lane { position: absolute; left: 36px; right: 36px; height: 10px; border-radius: 5px; background: #b9d8f5; }
      .lane.one { top: 64px; }
      .lane.two { top: 123px; }
      .lane.three { top: 182px; }
      .node { position: absolute; width: 28px; height: 28px; border: 7px solid #ffffff; border-radius: 50%; background: #2d7dd2; }
      .node.a { left: 46px; top: 55px; }
      .node.b { left: 104px; top: 114px; }
      .node.c { left: 164px; top: 173px; }
      .arrow { position: absolute; left: 67px; top: 87px; width: 110px; height: 72px; border-top: 9px solid #ffcc4d; transform: rotate(29deg); transform-origin: left center; }
      .arrow::after { content: ""; position: absolute; right: -5px; top: -18px; width: 25px; height: 25px; border-top: 9px solid #ffcc4d; border-right: 9px solid #ffcc4d; transform: rotate(45deg); }
      .letter { position: absolute; right: 24px; top: 12px; color: #ffffff; font: 900 44px/1 ui-sans-serif, system-ui, sans-serif; letter-spacing: -6px; }
    </style>
    <div class="mark" aria-label="Timeline workflow preview icon">
      <div class="lane one"></div><div class="lane two"></div><div class="lane three"></div>
      <div class="arrow"></div>
      <div class="node a"></div><div class="node b"></div><div class="node c"></div>
      <div class="letter">W</div>
    </div>`);
  await page.screenshot({ path: `${imagesDirectory}/icon.png` });
  await page.close();
}

async function createPreview(browserInstance) {
  const markdown = `# Purchase approval specification

\`\`\`workflow
# Purchase Approval

## lanes
- requester: Requester
- manager: Manager
- finance: Finance

## nodes
- requester
  - draft: Create request
- manager
  - review: Review
- finance
  - budget: Check budget

## workflow
- draft -> review -> budget
\`\`\``;
  const svg = renderWorkflowSvg(layoutWorkflow(parseWorkflow(markdown)));
  const page = await browserInstance.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; background: #181818; color: #cccccc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      .titlebar { height: 42px; display: flex; align-items: center; justify-content: center; background: #1f1f1f; border-bottom: 1px solid #313131; color: #dddddd; font-size: 13px; }
      .workspace { display: grid; grid-template-columns: 48px 1fr 1.15fr; height: 858px; }
      .activity { background: #202020; border-right: 1px solid #313131; display: grid; align-content: start; gap: 18px; padding-top: 18px; text-align: center; color: #8f8f8f; font-size: 20px; }
      .pane { min-width: 0; display: flex; flex-direction: column; border-right: 1px solid #333333; }
      .tab { height: 42px; display: flex; align-items: center; gap: 8px; padding: 0 18px; background: #1f1f1f; border-bottom: 1px solid #313131; color: #e3e3e3; font-size: 13px; }
      .markdown-icon { color: #75beff; font-weight: 800; }
      .editor { flex: 1; overflow: hidden; padding: 24px 26px; background: #1e1e1e; }
      pre { margin: 0; color: #d4d4d4; font: 16px/1.58 ui-monospace, SFMono-Regular, Menlo, monospace; white-space: pre-wrap; }
      .preview { flex: 1; overflow: hidden; padding: 32px 26px; background: #252526; }
      .canvas { background: white; border-radius: 4px; box-shadow: 0 10px 28px rgba(0,0,0,.32); overflow: hidden; }
      .canvas svg { display: block; width: 100%; height: auto; }
    </style>
    <div class="titlebar">purchase-approval.md — Timeline Workflow Preview</div>
    <div class="workspace">
      <aside class="activity"><span>▱</span><span>⌕</span><span>⑂</span><span>▦</span></aside>
      <section class="pane">
        <div class="tab"><span class="markdown-icon">M↓</span> purchase-approval.md</div>
        <div class="editor"><pre>${escapeHtml(markdown)}</pre></div>
      </section>
      <section class="pane">
        <div class="tab">⌕ Workflow Preview — purchase-approval.md</div>
        <div class="preview"><div class="canvas">${svg}</div></div>
      </section>
    </div>`);
  await page.screenshot({ path: `${imagesDirectory}/preview.png` });
  await page.close();
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
