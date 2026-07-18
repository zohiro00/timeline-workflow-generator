import { randomBytes } from "node:crypto";
import * as vscode from "vscode";
import { PreviewController } from "./preview-controller.js";
import { createPreviewHtml } from "./preview-html.js";
import { createVscodeLocalizer } from "./localization.js";

const viewType = "timelineWorkflow.preview";

export class WorkflowPreviewPanel {
  constructor() {
    this.localizer = createVscodeLocalizer(vscode);
    this.panel = null;
    this.controller = null;
    this.disposables = [];
    this.webviewReady = false;
  }

  get lastState() {
    return this.controller?.lastState;
  }

  show() {
    const activeEditor = vscode.window.activeTextEditor;

    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Beside, true);
      this.controller.onActiveEditorChanged(activeEditor);
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      viewType,
      this.localizer.message("previewTitle"),
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      { enableScripts: true, retainContextWhenHidden: true },
    );
    this.panel.webview.html = createPreviewHtml(randomBytes(16).toString("hex"), this.localizer);
    this.controller = new PreviewController({ render: (state) => this.render(state), localizer: this.localizer });

    this.disposables.push(
      this.panel.onDidDispose(() => this.disposePanel()),
      this.panel.webview.onDidReceiveMessage((event) => {
        if (event?.type !== "ready") return;
        this.webviewReady = true;
        this.postLatestState();
      }),
      vscode.window.onDidChangeActiveTextEditor((editor) => this.controller.onActiveEditorChanged(editor)),
      vscode.workspace.onDidChangeTextDocument((event) => this.controller.onDocumentChanged(event.document)),
      vscode.workspace.onDidCloseTextDocument((document) => this.controller.onDocumentClosed(document)),
    );

    this.controller.showInitial(activeEditor);
  }

  dispose() {
    this.panel?.dispose();
    this.disposePanel();
  }

  render(state) {
    if (this.panel) this.panel.title = state.title;
    this.postLatestState();
  }

  postLatestState() {
    if (!this.panel || !this.webviewReady || !this.controller?.lastState) return;
    void this.panel.webview.postMessage(this.controller.lastState);
  }

  disposePanel() {
    if (!this.panel && !this.controller && this.disposables.length === 0) return;

    const disposables = this.disposables;
    this.disposables = [];
    this.panel = null;
    this.webviewReady = false;
    this.controller?.dispose();
    this.controller = null;
    disposables.forEach((disposable) => disposable.dispose());
  }
}
