import * as vscode from "vscode";
import { WorkflowPreviewPanel } from "./preview-panel.js";

export const openPreviewCommand = "timelineWorkflow.openPreview";

export function activate(context) {
  const previewPanel = new WorkflowPreviewPanel();
  context.subscriptions.push(
    previewPanel,
    vscode.commands.registerCommand(openPreviewCommand, () => previewPanel.show()),
  );

  if (context.extensionMode !== vscode.ExtensionMode.Production) {
    return Object.freeze({
      getPreviewState: () => previewPanel.lastState,
    });
  }

  return undefined;
}
