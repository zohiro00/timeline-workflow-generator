import { layoutWorkflow, parseWorkflow, renderWorkflowSvg, WorkflowError } from "./workflow.js";
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

const settingsSchema = [
  {
    id: "canvas",
    title: "Canvas",
    items: [
      {
        id: "gridXSize",
        label: "時間軸の間隔",
        description: "ノード間の横方向スペース",
        type: "range",
        min: 144,
        max: 240,
        step: 4,
        value: 188,
        unit: "px",
      },
      {
        id: "gridYSize",
        label: "レーンの高さ",
        description: "レーン同士の縦方向スペース",
        type: "range",
        min: 88,
        max: 152,
        step: 4,
        value: 116,
        unit: "px",
      },
    ],
  },
  {
    id: "nodes",
    title: "Nodes",
    items: [
      {
        id: "nodeWidth",
        label: "ノード幅",
        description: "各ノードの表示幅",
        type: "range",
        min: 96,
        max: 164,
        step: 4,
        value: 112,
        unit: "px",
      },
      {
        id: "nodeHeight",
        label: "ノード高さ",
        description: "各ノードの表示高さ",
        type: "range",
        min: 36,
        max: 60,
        step: 2,
        value: 42,
        unit: "px",
      },
    ],
  },
  {
    id: "style",
    title: "Style",
    items: [
      {
        id: "themeHint",
        label: "配色プリセット",
        description: "PowerPoint標準カラーをベースにした白背景テーマ",
        type: "select",
        value: "powerpoint",
        options: [{ value: "powerpoint", label: "PowerPoint Orange" }],
      },
      {
        id: "autoRender",
        label: "自動プレビュー",
        description: "入力と同時にSVGを更新",
        type: "toggle",
        value: true,
      },
    ],
  },
];

const settings = Object.fromEntries(settingsSchema.flatMap((group) => group.items.map((item) => [item.id, item.value])));

document.querySelector("#app").innerHTML = location.pathname.startsWith("/engine")
  ? renderEnginePage()
  : renderTopPage();

if (location.pathname.startsWith("/engine")) {
  mountEngine();
}

function renderTopPage() {
  return `
    <div class="site-shell">
      <header class="site-header">
        <a class="brand" href="/" aria-label="トップへ">
          <span class="brand-mark">P</span>
          <span class="brand-text">Timeline Workflow</span>
        </a>
        <nav class="site-nav" aria-label="Primary">
          <a href="https://github.com/zohiro00/timeline-workflow-generator" target="_blank" rel="noopener">GitHub</a>
          <a class="nav-primary" href="/engine">Engine</a>
        </nav>
      </header>

      <main>
        <section class="hero">
          <div class="hero-badge">
            <span class="badge-dot"></span>
            workflow DSL to PowerPoint-ready SVG
          </div>
          <h1 class="hero-title">時系列ワークフロー図を<br><span>PowerPointらしく</span>整える</h1>
          <p class="hero-sub">
            Markdown内の workflow ブロックから、レーン・時系列・依存関係を読み取り、
            そのまま資料に貼りやすいSVGを生成します。
          </p>
          <a class="hero-cta" href="/engine">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
            Engineを開く
          </a>

          <div class="demo-flow" aria-label="Before and after example">
            <div class="demo-block">
              <div class="block-label">Input</div>
              <code>node a1: 作成 (lane: a申請)</code>
              <code>a1 -&gt; a2 -&gt; b1</code>
              <code>b1 -.-> a4</code>
            </div>
            <div class="demo-arrow">→</div>
            <div class="demo-block demo-output">
              <div class="block-label">Output</div>
              <div class="mini-lane"><span>作成</span><span>承認</span><span>差戻</span></div>
              <div class="mini-line"></div>
              <div class="mini-lane"><span>受付</span><span>完了</span></div>
            </div>
          </div>
        </section>

        <section class="features" aria-labelledby="features-title">
          <h2 id="features-title">Features</h2>
          <div class="features-grid">
            ${featureCard("Markdown対応", "文章の中に workflow ブロックを書くだけで図を生成できます。")}
            ${featureCard("時系列同期", "依存関係を読み取り、ノードの時間位置を自動で揃えます。")}
            ${featureCard("設定拡張前提", "engine の左メニューから今後、色や矢印スタイルを追加できます。")}
            ${featureCard("SVGダウンロード", "PowerPointに貼り付けやすいSVGとして保存できます。")}
          </div>
        </section>
      </main>

      <footer class="site-footer">
        <span>Timeline Workflow Generator</span>
        <a href="/engine">Engine</a>
      </footer>
    </div>
  `;
}

function featureCard(title, description) {
  return `
    <article class="feature-card">
      <div class="feature-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M5 12h14M12 5v14" /></svg>
      </div>
      <h3>${title}</h3>
      <p>${description}</p>
    </article>
  `;
}

function renderEnginePage() {
  return `
    <div class="app-shell">
      <header class="titlebar">
        <a class="titlebar-brand" href="/">
          <span class="brand-mark">P</span>
          <span>Timeline Workflow</span>
        </a>
        <div class="titlebar-title">時系列ワークフロー図ジェネレーター <span>workflow.svg</span></div>
        <nav class="titlebar-nav" aria-label="Engine navigation">
          <a href="/">Top</a>
        </nav>
      </header>

      <div class="engine-body">
        <nav class="activity" aria-label="Activity Bar">
          <button class="activity-btn active" type="button" data-tooltip="Settings" aria-label="Settings">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.05.05a2 2 0 1 1-2.83 2.83l-.05-.05A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.08A1.7 1.7 0 0 0 8.6 19a1.7 1.7 0 0 0-1.88.34l-.05.05a2 2 0 1 1-2.83-2.83l.05-.05A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.08A1.7 1.7 0 0 0 5 8.6a1.7 1.7 0 0 0-.34-1.88l-.05-.05a2 2 0 1 1 2.83-2.83l.05.05A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.08A1.7 1.7 0 0 0 15.4 5a1.7 1.7 0 0 0 1.88-.34l.05-.05a2 2 0 1 1 2.83 2.83l-.05.05A1.7 1.7 0 0 0 19.4 9c.2.38.58.6 1 .6h.1a2 2 0 1 1 0 4h-.08a1.7 1.7 0 0 0-1.02 1.4Z" /></svg>
          </button>
          <button class="activity-btn" type="button" data-tooltip="Workflow" aria-label="Workflow">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h12v5H6zM6 18h12M9 11v7M15 11v7" /></svg>
          </button>
          <div class="activity-spacer"></div>
          <button id="download-svg" class="activity-btn" type="button" data-tooltip="Download SVG" aria-label="Download SVG">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M4 19h16" /></svg>
          </button>
        </nav>

        <aside class="settings-sidebar" aria-label="Settings">
          <div class="sidebar-header">
            <span>Settings</span>
            <span class="sidebar-more">...</span>
          </div>
          ${settingsSchema.map(renderSettingsGroup).join("")}
        </aside>

        <main class="workspace">
          <section class="pane source-pane" aria-label="Workflow DSL editor">
            <div class="tabs">
              <div class="tab active">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
                source.workflow
                <span class="dirty-dot"></span>
              </div>
            </div>
            <div class="pane-toolbar">
              <div class="breadcrumb">workspace <span>/</span> source.workflow</div>
              <button id="format-sample" class="icon-btn" type="button" aria-label="サンプルを復元">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7M3 4v6h6" /></svg>
              </button>
            </div>
            <div class="editor-body">
              <div id="gutter" class="gutter" aria-hidden="true"></div>
              <textarea id="source" class="code-input" spellcheck="false" aria-label="workflow DSL"></textarea>
            </div>
          </section>

          <section class="pane preview-pane" aria-label="SVG preview">
            <div class="tabs">
              <div class="tab active">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4z" /><path d="M8 12h8M12 8v8" /></svg>
                preview.svg
              </div>
            </div>
            <div class="pane-toolbar">
              <div id="status" class="status" role="status"></div>
            </div>
            <div id="preview" class="preview-canvas"></div>
          </section>
        </main>
      </div>

      <footer class="statusbar">
        <span id="status-summary">Ready</span>
        <span>PowerPoint Orange</span>
        <span class="statusbar-spacer"></span>
        <span>UTF-8</span>
        <span>SVG</span>
      </footer>
    </div>
  `;
}

function renderSettingsGroup(group) {
  return `
    <section class="settings-group" data-group="${group.id}">
      <button class="settings-group-header" type="button" aria-expanded="true">
        <svg class="chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4" /></svg>
        ${group.title}
      </button>
      <div class="settings-body">
        ${group.items.map(renderSetting).join("")}
      </div>
    </section>
  `;
}

function renderSetting(item) {
  if (item.type === "range") {
    return `
      <label class="setting">
        <span class="setting-label">${item.label}<output id="${item.id}-value">${item.value}${item.unit}</output></span>
        <span class="setting-desc">${item.description}</span>
        <input data-setting="${item.id}" type="range" min="${item.min}" max="${item.max}" step="${item.step}" value="${item.value}" />
      </label>
    `;
  }

  if (item.type === "toggle") {
    return `
      <label class="setting toggle-setting">
        <span>
          <span class="setting-label">${item.label}</span>
          <span class="setting-desc">${item.description}</span>
        </span>
        <input data-setting="${item.id}" type="checkbox" ${item.value ? "checked" : ""} />
      </label>
    `;
  }

  return `
    <label class="setting">
      <span class="setting-label">${item.label}</span>
      <span class="setting-desc">${item.description}</span>
      <select data-setting="${item.id}">
        ${item.options.map((option) => `<option value="${option.value}" ${option.value === item.value ? "selected" : ""}>${option.label}</option>`).join("")}
      </select>
    </label>
  `;
}

function mountEngine() {
  const source = document.querySelector("#source");
  const gutter = document.querySelector("#gutter");
  const status = document.querySelector("#status");
  const statusSummary = document.querySelector("#status-summary");
  const preview = document.querySelector("#preview");
  const download = document.querySelector("#download-svg");
  const restoreSample = document.querySelector("#format-sample");
  let currentSvg = "";

  source.value = sample;
  source.addEventListener("input", () => {
    updateGutter();
    if (settings.autoRender) render();
  });
  restoreSample.addEventListener("click", () => {
    source.value = sample;
    updateGutter();
    render();
  });
  download.addEventListener("click", downloadSvg);

  document.querySelectorAll("[data-setting]").forEach((control) => {
    control.addEventListener("input", () => {
      const key = control.dataset.setting;
      settings[key] = control.type === "checkbox"
        ? control.checked
        : control.type === "range"
          ? Number(control.value)
          : control.value;
      const output = document.querySelector(`#${key}-value`);
      if (output) output.textContent = `${settings[key]}px`;
      if (key === "autoRender" && !settings.autoRender) return;
      render();
    });
  });

  document.querySelectorAll(".settings-group-header").forEach((button) => {
    button.addEventListener("click", () => {
      const group = button.closest(".settings-group");
      const collapsed = group.classList.toggle("collapsed");
      button.setAttribute("aria-expanded", String(!collapsed));
    });
  });

  updateGutter();
  render();

  function render() {
    try {
      const workflow = layoutWorkflow(parseWorkflow(source.value));
      currentSvg = renderWorkflowSvg(workflow, pickWorkflowOptions());
      preview.innerHTML = currentSvg;
      status.className = "status ok";
      status.textContent = `${workflow.nodes.length} nodes / ${workflow.edges.length} edges / ${workflow.lanes.length} lanes`;
      statusSummary.textContent = "Preview updated";
      download.disabled = false;
    } catch (error) {
      currentSvg = "";
      preview.innerHTML = `<div class="empty-state">構文を確認してください</div>`;
      status.className = "status error";
      status.textContent = error instanceof WorkflowError ? error.message : String(error);
      statusSummary.textContent = "Error";
      download.disabled = true;
    }
  }

  function pickWorkflowOptions() {
    return {
      gridXSize: settings.gridXSize,
      gridYSize: settings.gridYSize,
      nodeWidth: settings.nodeWidth,
      nodeHeight: settings.nodeHeight,
    };
  }

  function updateGutter() {
    const lines = source.value.split(/\r?\n/).length;
    gutter.innerHTML = Array.from({ length: lines }, (_, index) => `<div>${index + 1}</div>`).join("");
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
}
