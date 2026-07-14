const assert = require("node:assert/strict");
const vscode = require("vscode");

const extensionId = "zohiro00.timeline-workflow-preview";
const commandId = "timelineWorkflow.openPreview";

suite("Timeline Workflow Preview", function () {
  this.timeout(10000);

  teardown(async () => {
    await vscode.commands.executeCommand("workbench.action.closeAllEditors");
  });

  test("opens and live-updates the active Markdown preview", async () => {
    const extension = vscode.extensions.getExtension(extensionId);
    assert.ok(extension);
    const api = await extension.activate();
    assert.equal(extension.isActive, true);
    assert.equal(typeof api?.getPreviewState, "function");

    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes(commandId));

    const fixture = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, "workflow.md");
    const document = await vscode.workspace.openTextDocument(fixture);
    await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
    await vscode.commands.executeCommand(commandId);
    await waitFor(() => api.getPreviewState()?.kind === "ready");
    assert.match(api.getPreviewState().svg, /Integration Preview/);

    const updated = document.getText().replace("Integration Preview", "Updated Without Save");
    const edit = new vscode.WorkspaceEdit();
    edit.replace(document.uri, new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), updated);
    assert.equal(await vscode.workspace.applyEdit(edit), true);
    await waitFor(() => api.getPreviewState()?.svg?.includes("Updated Without Save"));

    const second = await vscode.workspace.openTextDocument({
      language: "markdown",
      content: updated.replace("Updated Without Save", "Second Document"),
    });
    await vscode.window.showTextDocument(second, vscode.ViewColumn.One);
    await waitFor(() => api.getPreviewState()?.svg?.includes("Second Document"));

    const plainText = await vscode.workspace.openTextDocument({ language: "plaintext", content: "plain text" });
    await vscode.window.showTextDocument(plainText, vscode.ViewColumn.One);
    await waitFor(() => api.getPreviewState()?.kind === "no-markdown");
  });
});

async function waitFor(predicate, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.fail("Timed out waiting for the preview state.");
}
