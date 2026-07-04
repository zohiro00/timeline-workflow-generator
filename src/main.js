import { layoutWorkflow, parseWorkflow, renderWorkflowSvg, WorkflowError, workflowSvgDefaults } from "./workflow.js";
import { sampleWorkflowSource, workflowExamples } from "./sample-workflow.js";
import "./styles.css";

const stackedWorkspaceQuery = "(max-width: 980px)";
const paneResizeConfig = Object.freeze({
  desktop: {
    minSourceSize: 280,
    minPreviewSize: 360,
  },
  stacked: {
    minSourceSize: 220,
    minPreviewSize: 220,
  },
});

const settingsSchema = [
  {
    id: "style",
    title: "Style",
    initiallyExpanded: true,
    items: [
      {
        id: "themeHint",
        label: "配色プリセット",
        description: "資料向けのSVG配色テーマ",
        type: "select",
        value: "consulting-blue-outline",
        options: [
          { value: "consulting-blue-outline", label: "濃い青 / 枠線" },
          { value: "consulting-blue-fill", label: "濃い青 / 塗りつぶし" },
          { value: "consulting-gray-outline", label: "灰色 / 枠線" },
          { value: "consulting-gray-fill", label: "灰色 / 塗りつぶし" },
        ],
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
  {
    id: "canvas",
    title: "Canvas",
    initiallyExpanded: false,
    items: [
      {
        id: "gridXSize",
        label: "時間軸の間隔",
        description: "ノード間の横方向スペース",
        type: "range",
        min: 144,
        max: 240,
        step: 4,
        value: workflowSvgDefaults.gridXSize,
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
        value: workflowSvgDefaults.gridYSize,
        unit: "px",
      },
    ],
  },
  {
    id: "nodes",
    title: "Nodes",
    initiallyExpanded: false,
    items: [
      {
        id: "nodeWidth",
        label: "ノード幅",
        description: "各ノードの表示幅",
        type: "range",
        min: 96,
        max: 164,
        step: 4,
        value: workflowSvgDefaults.nodeWidth,
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
        value: workflowSvgDefaults.nodeHeight,
        unit: "px",
      },
    ],
  },
];

const defaultSettings = Object.fromEntries(settingsSchema.flatMap((group) => group.items.map((item) => [item.id, item.value])));
const settings = { ...defaultSettings };
const previewZoomConfig = Object.freeze({
  min: 0.25,
  max: 2.5,
  step: 0.1,
});

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
            Markdown workflow to PowerPoint-ready SVG
          </div>
          <h1 class="hero-title">時系列ワークフロー図を<br><span>PowerPointらしく</span>整える</h1>
          <p class="hero-sub">
            Markdownの lanes / nodes / workflow セクションから、レーン・時系列・依存関係を読み取り、
            そのまま資料に貼りやすいSVGを生成します。
          </p>
          <a class="hero-cta" href="/engine">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
            Engineを開く
          </a>

          <div class="demo-flow" aria-label="Before and after example">
            <div class="demo-block">
              <div class="block-label">Input</div>
              <code>## nodes</code>
              <code>  - a1: 作成</code>
              <code>- a1 -&gt; a2 -&gt; b1</code>
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
            ${featureCard("矢印種別", "実線・点線・中止マーク・見えない依存で分岐を表現できます。")}
            ${featureCard("調整とSVG保存", "配色、サイズ、ズームを整え、PowerPoint向けSVGとして保存できます。")}
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
          <button id="settings-toggle" class="activity-btn active" type="button" data-tooltip="Settings" aria-label="Settings" aria-controls="settings-sidebar" aria-expanded="true">
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

        <aside id="settings-sidebar" class="settings-sidebar" aria-label="Settings">
          <div class="sidebar-header">
            <span>Settings</span>
            <button id="reset-settings" class="sidebar-icon-btn" type="button" aria-label="設定を既定値に戻す" data-tooltip="Reset settings">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7M3 4v6h6" /></svg>
            </button>
          </div>
          ${settingsSchema.map(renderSettingsGroup).join("")}
        </aside>

        <main class="workspace">
          <section class="pane source-pane" aria-label="Markdown workflow editor">
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
              <textarea id="source" class="code-input" spellcheck="false" aria-label="Markdown workflow"></textarea>
            </div>
            <section class="workflow-examples" aria-label="Example workflows">
              <button id="examples-toggle" class="workflow-examples-header" type="button" aria-expanded="true" aria-controls="workflow-examples-body">
                <svg class="chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4" /></svg>
                <span>Example Workflows</span>
              </button>
              <div id="workflow-examples-body" class="workflow-examples-body">
                ${workflowExamples.map(renderWorkflowExample).join("")}
              </div>
            </section>
          </section>

          <div class="pane-resizer" role="separator" tabindex="0" aria-label="エディターとプレビューのサイズ変更" aria-orientation="vertical"></div>

          <section class="pane preview-pane" aria-label="SVG preview">
            <div class="tabs">
              <div class="tab active">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4z" /><path d="M8 12h8M12 8v8" /></svg>
                preview.svg
              </div>
            </div>
            <div class="pane-toolbar">
              <div id="status" class="status" role="status"></div>
              <div class="preview-tools" aria-label="Preview zoom controls">
                <button id="preview-zoom-out" class="icon-btn" type="button" aria-label="プレビューを縮小" data-tooltip="Zoom out">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 21-4.3-4.3" /><circle cx="11" cy="11" r="7" /><path d="M8 11h6" /></svg>
                </button>
                <output id="preview-zoom-value" class="zoom-value" aria-label="現在のプレビュー倍率">100%</output>
                <button id="preview-zoom-in" class="icon-btn" type="button" aria-label="プレビューを拡大" data-tooltip="Zoom in">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 21-4.3-4.3" /><circle cx="11" cy="11" r="7" /><path d="M11 8v6M8 11h6" /></svg>
                </button>
                <button id="preview-zoom-reset" class="icon-btn" type="button" aria-label="プレビュー倍率をリセット" data-tooltip="Reset zoom">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7M3 4v6h6" /></svg>
                </button>
              </div>
            </div>
            <div id="preview" class="preview-canvas"></div>
          </section>
        </main>
      </div>

      <footer class="statusbar">
        <span id="status-summary">Ready</span>
        <span id="theme-label">濃い青 / 枠線</span>
        <span class="statusbar-spacer"></span>
        <span>UTF-8</span>
        <span>SVG</span>
      </footer>
    </div>
  `;
}

function renderSettingsGroup(group) {
  const expanded = group.initiallyExpanded !== false;
  const className = expanded ? "settings-group" : "settings-group collapsed";
  return `
    <section class="${className}" data-group="${group.id}">
      <button class="settings-group-header" type="button" aria-expanded="${expanded}">
        <svg class="chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4" /></svg>
        ${group.title}
      </button>
      <div class="settings-body">
        ${group.items.map(renderSetting).join("")}
      </div>
    </section>
  `;
}

function renderWorkflowExample(example) {
  return `
    <button class="workflow-example" type="button" data-workflow-example="${example.id}">
      <span class="workflow-example-title">${escapeHtml(example.title)}</span>
      <span class="workflow-example-desc">${escapeHtml(example.description)}</span>
    </button>
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
  const previewZoomOut = document.querySelector("#preview-zoom-out");
  const previewZoomIn = document.querySelector("#preview-zoom-in");
  const previewZoomReset = document.querySelector("#preview-zoom-reset");
  const previewZoomValue = document.querySelector("#preview-zoom-value");
  const download = document.querySelector("#download-svg");
  const restoreSample = document.querySelector("#format-sample");
  const resetSettings = document.querySelector("#reset-settings");
  const engineBody = document.querySelector(".engine-body");
  const settingsToggle = document.querySelector("#settings-toggle");
  const workspace = document.querySelector(".workspace");
  const sourcePane = document.querySelector(".source-pane");
  const paneResizer = document.querySelector(".pane-resizer");
  const examplesToggle = document.querySelector("#examples-toggle");
  const workflowExamplesById = new Map(workflowExamples.map((example) => [example.id, example]));
  const previewZoom = { scale: 1, mode: "fit" };
  let currentSvg = "";
  const scheduleRender = debounce(render, 240);

  source.value = sampleWorkflowSource;
  source.addEventListener("input", () => {
    updateGutter();
    if (settings.autoRender) scheduleRender();
  });
  restoreSample.addEventListener("click", () => {
    source.value = sampleWorkflowSource;
    updateGutter();
    render();
  });
  resetSettings.addEventListener("click", restoreDefaultSettings);
  download.addEventListener("click", downloadSvg);
  previewZoomOut.addEventListener("click", () => setPreviewZoom(previewZoom.scale - previewZoomConfig.step, "manual"));
  previewZoomIn.addEventListener("click", () => setPreviewZoom(previewZoom.scale + previewZoomConfig.step, "manual"));
  previewZoomReset.addEventListener("click", resetPreviewZoom);
  settingsToggle.addEventListener("click", toggleSettingsSidebar);
  paneResizer.addEventListener("pointerdown", startPaneResize);
  paneResizer.addEventListener("keydown", resizePaneWithKeyboard);
  examplesToggle.addEventListener("click", toggleWorkflowExamples);
  updatePaneResizerOrientation();
  window.addEventListener("resize", updatePaneResizerOrientation);
  new ResizeObserver(() => {
    if (previewZoom.mode === "fit") resetPreviewZoom();
  }).observe(preview);

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

  document.querySelectorAll("[data-workflow-example]").forEach((button) => {
    button.addEventListener("click", () => {
      const example = workflowExamplesById.get(button.dataset.workflowExample);
      if (!example) return;
      source.value = example.source;
      updateGutter();
      render();
    });
  });

  updateGutter();
  render();

  function toggleSettingsSidebar() {
    const collapsed = engineBody.classList.toggle("sidebar-collapsed");
    settingsToggle.classList.toggle("active", !collapsed);
    settingsToggle.setAttribute("aria-expanded", String(!collapsed));
  }

  function toggleWorkflowExamples() {
    const panel = examplesToggle.closest(".workflow-examples");
    const collapsed = panel.classList.toggle("collapsed");
    examplesToggle.setAttribute("aria-expanded", String(!collapsed));
  }

  function updatePaneResizerOrientation() {
    const isStacked = window.matchMedia(stackedWorkspaceQuery).matches;
    paneResizer.setAttribute("aria-orientation", isStacked ? "horizontal" : "vertical");
  }

  function startPaneResize(event) {
    event.preventDefault();
    const metrics = getPaneResizeMetrics();

    paneResizer.setPointerCapture(event.pointerId);
    document.body.classList.add("is-resizing-pane");

    const resize = (moveEvent) => {
      const rawSize = metrics.isStacked
        ? moveEvent.clientY - metrics.bounds.top
        : moveEvent.clientX - metrics.bounds.left;
      setSourcePaneSize(rawSize, metrics);
    };

    const stop = (upEvent) => {
      paneResizer.releasePointerCapture(upEvent.pointerId);
      paneResizer.removeEventListener("pointermove", resize);
      paneResizer.removeEventListener("pointerup", stop);
      paneResizer.removeEventListener("pointercancel", stop);
      document.body.classList.remove("is-resizing-pane");
    };

    paneResizer.addEventListener("pointermove", resize);
    paneResizer.addEventListener("pointerup", stop);
    paneResizer.addEventListener("pointercancel", stop);
  }

  function resizePaneWithKeyboard(event) {
    const metrics = getPaneResizeMetrics();
    const currentSize = metrics.isStacked
      ? sourcePane.getBoundingClientRect().height
      : sourcePane.getBoundingClientRect().width;
    const keyToDelta = metrics.isStacked
      ? { ArrowUp: -24, ArrowDown: 24 }
      : { ArrowLeft: -24, ArrowRight: 24 };
    const delta = keyToDelta[event.key];
    if (!delta) return;

    event.preventDefault();
    setSourcePaneSize(currentSize + delta, metrics);
  }

  function getPaneResizeMetrics() {
    const isStacked = window.matchMedia(stackedWorkspaceQuery).matches;
    const sizeConfig = isStacked ? paneResizeConfig.stacked : paneResizeConfig.desktop;
    const bounds = workspace.getBoundingClientRect();
    return {
      isStacked,
      bounds,
      ...sizeConfig,
      resizerSize: isStacked ? paneResizer.offsetHeight : paneResizer.offsetWidth,
    };
  }

  function setSourcePaneSize(rawSize, metrics) {
    const totalSize = metrics.isStacked ? metrics.bounds.height : metrics.bounds.width;
    const maxSourceSize = Math.max(metrics.minSourceSize, totalSize - metrics.minPreviewSize - metrics.resizerSize);
    const nextSize = Math.min(Math.max(rawSize, metrics.minSourceSize), maxSourceSize);
    workspace.style.setProperty("--source-pane-size", `${Math.round(nextSize)}px`);
  }

  function render() {
    updateThemeLabel();
    try {
      const workflow = layoutWorkflow(parseWorkflow(source.value));
      currentSvg = renderWorkflowSvg(workflow, pickWorkflowOptions());
      preview.innerHTML = `<div class="preview-viewport"><div class="preview-art">${currentSvg}</div></div>`;
      syncPreviewZoom();
      status.className = "status ok";
      status.textContent = `${workflow.nodes.length} nodes / ${workflow.edges.length} edges / ${workflow.lanes.length} lanes`;
      statusSummary.textContent = "Preview updated";
      download.disabled = false;
    } catch (error) {
      currentSvg = "";
      preview.innerHTML = `<div class="empty-state">構文を確認してください</div>`;
      updatePreviewZoomControls();
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
      theme: settings.themeHint,
    };
  }

  function updateThemeLabel() {
    const themeLabel = document.querySelector("#theme-label");
    const themeSetting = settingsSchema.flatMap((group) => group.items).find((item) => item.id === "themeHint");
    const selectedOption = themeSetting.options.find((option) => option.value === settings.themeHint);
    themeLabel.textContent = selectedOption?.label ?? "濃い青 / 枠線";
  }

  function restoreDefaultSettings() {
    Object.assign(settings, defaultSettings);
    document.querySelectorAll("[data-setting]").forEach((control) => {
      const key = control.dataset.setting;
      if (control.type === "checkbox") {
        control.checked = Boolean(defaultSettings[key]);
      } else {
        control.value = defaultSettings[key];
      }
      const output = document.querySelector(`#${key}-value`);
      if (output) output.textContent = `${defaultSettings[key]}px`;
    });
    render();
  }

  function resetPreviewZoom() {
    const fitScale = calculatePreviewFitScale();
    previewZoom.mode = "fit";
    setPreviewZoom(fitScale, "fit");
  }

  function syncPreviewZoom() {
    if (previewZoom.mode === "fit") {
      resetPreviewZoom();
      return;
    }
    setPreviewZoom(previewZoom.scale, "manual");
  }

  function setPreviewZoom(scale, mode) {
    const dimensions = getPreviewSvgDimensions();
    const viewport = preview.querySelector(".preview-viewport");
    const art = preview.querySelector(".preview-art");
    const svg = preview.querySelector("svg");

    if (!dimensions || !viewport || !art || !svg) {
      updatePreviewZoomControls();
      return;
    }

    const nextScale = clamp(scale, previewZoomConfig.min, previewZoomConfig.max);
    previewZoom.scale = nextScale;
    previewZoom.mode = mode;

    art.style.width = `${dimensions.width}px`;
    art.style.height = `${dimensions.height}px`;
    art.style.transform = `scale(${nextScale})`;
    viewport.style.width = `${Math.round(dimensions.width * nextScale)}px`;
    viewport.style.height = `${Math.round(dimensions.height * nextScale)}px`;
    svg.style.width = `${dimensions.width}px`;
    svg.style.height = `${dimensions.height}px`;
    updatePreviewZoomControls();
  }

  function calculatePreviewFitScale() {
    const dimensions = getPreviewSvgDimensions();
    if (!dimensions) return 1;

    const styles = getComputedStyle(preview);
    const horizontalPadding = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
    const verticalPadding = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
    const availableWidth = Math.max(1, preview.clientWidth - horizontalPadding);
    const availableHeight = Math.max(1, preview.clientHeight - verticalPadding);
    return clamp(
      Math.min(1, availableWidth / dimensions.width, availableHeight / dimensions.height),
      previewZoomConfig.min,
      previewZoomConfig.max,
    );
  }

  function getPreviewSvgDimensions() {
    const svg = preview.querySelector("svg");
    const viewBox = svg?.viewBox?.baseVal;
    if (!svg || !viewBox?.width || !viewBox?.height) return null;
    return {
      width: viewBox.width,
      height: viewBox.height,
    };
  }

  function updatePreviewZoomControls() {
    const hasPreview = Boolean(preview.querySelector("svg"));
    previewZoomOut.disabled = !hasPreview || previewZoom.scale <= previewZoomConfig.min;
    previewZoomIn.disabled = !hasPreview || previewZoom.scale >= previewZoomConfig.max;
    previewZoomReset.disabled = !hasPreview;
    previewZoomValue.value = hasPreview ? `${Math.round(previewZoom.scale * 100)}%` : "";
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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function debounce(callback, delay) {
  let timerId;
  return (...args) => {
    clearTimeout(timerId);
    timerId = setTimeout(() => callback(...args), delay);
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
