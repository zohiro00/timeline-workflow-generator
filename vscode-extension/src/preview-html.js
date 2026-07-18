import { createDefaultLocalizer } from "./localization.js";

export function createPreviewHtml(nonce, localizer = createDefaultLocalizer()) {
  return `<!doctype html>
<html lang="${localizer.locale}">
  <head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Workflow Preview</title>
    <style>
      :root { color-scheme: light dark; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: var(--vscode-editor-foreground);
        background: var(--vscode-editor-background);
        font-family: var(--vscode-font-family);
      }
      .status {
        max-width: 680px;
        margin: 48px auto;
        padding: 24px;
        border: 1px solid var(--vscode-panel-border);
        border-radius: 8px;
        background: var(--vscode-editorWidget-background);
      }
      .status[hidden], .preview[hidden] { display: none; }
      .status h1 { margin: 0 0 12px; font-size: 18px; }
      .status p { margin: 0; line-height: 1.7; white-space: pre-wrap; }
      .status.error { border-color: var(--vscode-inputValidation-errorBorder); }
      .preview {
        width: 100%;
        min-height: 100vh;
        padding: 24px;
        overflow: auto;
      }
      .preview svg {
        display: block;
        max-width: none;
        height: auto;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.18);
      }
    </style>
  </head>
  <body>
    <main>
      <section id="status" class="status" aria-live="polite">
        <h1 id="heading"></h1>
        <p id="message"></p>
      </section>
      <section id="preview" class="preview" hidden aria-label="${localizer.message("previewAriaLabel")}"></section>
    </main>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      const status = document.getElementById("status");
      const heading = document.getElementById("heading");
      const message = document.getElementById("message");
      const preview = document.getElementById("preview");

      function render(state) {
        document.title = state.title || "Workflow Preview";
        if (state.kind === "ready") {
          status.hidden = true;
          preview.hidden = false;
          preview.innerHTML = state.svg;
          const svg = preview.querySelector("svg");
          const viewBox = svg?.viewBox?.baseVal;
          if (svg && viewBox?.width > 0 && viewBox?.height > 0) {
            svg.style.width = viewBox.width + "px";
            svg.style.height = viewBox.height + "px";
          }
        } else {
          preview.hidden = true;
          preview.replaceChildren();
          status.hidden = false;
          status.classList.toggle("error", state.kind.endsWith("error"));
          heading.textContent = state.heading;
          message.textContent = state.message;
        }
        vscode.setState(state);
      }

      const persistedState = vscode.getState();
      if (persistedState) render(persistedState);
      window.addEventListener("message", (event) => render(event.data));
      vscode.postMessage({ type: "ready" });
    </script>
  </body>
</html>`;
}
