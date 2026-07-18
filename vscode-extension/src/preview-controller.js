import { createNoMarkdownState, createPreviewState } from "./preview-state.js";

export const previewUpdateDelayMs = 150;

export class PreviewController {
  constructor({ render, localizer, schedule = setTimeout, cancel = clearTimeout, delay = previewUpdateDelayMs }) {
    this.render = render;
    this.schedule = schedule;
    this.cancel = cancel;
    this.delay = delay;
    this.localizer = localizer;
    this.currentDocument = null;
    this.pendingUpdate = null;
    this.lastState = createNoMarkdownState(this.localizer);
  }

  showInitial(editor) {
    if (isMarkdownEditor(editor)) {
      this.useDocument(editor.document);
    } else {
      this.renderNoMarkdown();
    }
  }

  onActiveEditorChanged(editor) {
    if (editor == null) return;

    if (isMarkdownEditor(editor)) {
      this.useDocument(editor.document);
    } else {
      this.renderNoMarkdown();
    }
  }

  onDocumentChanged(document) {
    if (!sameDocument(document, this.currentDocument)) return;

    this.clearPendingUpdate();
    this.pendingUpdate = this.schedule(() => {
      this.pendingUpdate = null;
      this.renderDocument(document);
    }, this.delay);
  }

  onDocumentClosed(document) {
    if (!sameDocument(document, this.currentDocument)) return;
    this.renderNoMarkdown();
  }

  dispose() {
    this.clearPendingUpdate();
    this.currentDocument = null;
  }

  useDocument(document) {
    this.clearPendingUpdate();
    this.currentDocument = document;
    this.renderDocument(document);
  }

  renderDocument(document) {
    this.publish(createPreviewState(document.getText(), displayName(document), this.localizer));
  }

  renderNoMarkdown() {
    this.clearPendingUpdate();
    this.currentDocument = null;
    this.publish(createNoMarkdownState(this.localizer));
  }

  publish(state) {
    this.lastState = state;
    this.render(state);
  }

  clearPendingUpdate() {
    if (this.pendingUpdate == null) return;
    this.cancel(this.pendingUpdate);
    this.pendingUpdate = null;
  }
}

function isMarkdownEditor(editor) {
  return editor?.document?.languageId === "markdown";
}

function sameDocument(left, right) {
  if (left == null || right == null) return false;
  return documentId(left) === documentId(right);
}

function documentId(document) {
  return document.uri?.toString?.() ?? document.fileName;
}

function displayName(document) {
  const fileName = document.fileName || document.uri?.path || "Untitled";
  return fileName.split(/[\\/]/).pop();
}
