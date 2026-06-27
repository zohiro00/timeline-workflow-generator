import { generateWorkflowSvg, layoutWorkflow, parseWorkflow, WorkflowError } from "./workflow.js";
import "./styles.css";

const sample = `# Markdownの中に workflow ブロックを書けます

\`\`\`workflow
title: 申請ワークフローの時系列図

lane: a申請
lane: b申請
lane: c申請

node a1: 作成 (lane: a申請)
node a2: 承認 (lane: a申請)
node a3: 保留 (lane: a申請)
node a4: 取消 (lane: a申請)
node b1: 作成 (lane: b申請)
node b2: 承認 (lane: b申請)

a1 -> a2
a2 -> b1
b1 -> b2
b1 -.-> a4
a2 -> a3 -> a4
\`\`\``;

document.querySelector("#app").innerHTML = `
  <main class="shell">
    <section class="editor-pane" aria-label="DSL editor">
      <div class="toolbar">
        <div>
          <h1>時系列ワークフロー図ジェネレーター</h1>
          <p>依存関係から時間軸を自動同期します。</p>
        </div>
        <button id="download-svg" type="button">SVG</button>
      </div>
      <textarea id="source" spellcheck="false" aria-label="workflow DSL"></textarea>
      <div id="status" class="status" role="status"></div>
    </section>
    <section class="preview-pane" aria-label="SVG preview">
      <div id="preview" class="preview"></div>
    </section>
  </main>
`;

const source = document.querySelector("#source");
const status = document.querySelector("#status");
const preview = document.querySelector("#preview");
const download = document.querySelector("#download-svg");
let currentSvg = "";

source.value = sample;
source.addEventListener("input", render);
download.addEventListener("click", downloadSvg);
render();

function render() {
  try {
    const workflow = layoutWorkflow(parseWorkflow(source.value));
    currentSvg = generateWorkflowSvg(source.value);
    preview.innerHTML = currentSvg;
    status.className = "status ok";
    status.textContent = `${workflow.nodes.length} nodes / ${workflow.edges.length} edges / ${workflow.lanes.length} lanes`;
    download.disabled = false;
  } catch (error) {
    currentSvg = "";
    preview.innerHTML = `<div class="empty-state">構文を確認してください</div>`;
    status.className = "status error";
    status.textContent = error instanceof WorkflowError ? error.message : String(error);
    download.disabled = true;
  }
}

function downloadSvg() {
  if (!currentSvg) return;
  const blob = new Blob([currentSvg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "workflow.svg";
  anchor.click();
  URL.revokeObjectURL(url);
}
