import { formatWorkflowError, normalizeLocale, workflowLocaleOptions } from "../../src/i18n.js";

const japaneseFallback = Object.freeze({
  previewTitle: "Workflow Preview",
  openMarkdownHeading: "Markdownファイルを開いてください",
  openMarkdownMessage: "アクティブなMarkdownファイルに含まれる workflow コードブロックをプレビューします。",
  missingWorkflowHeading: "workflow ブロックが見つかりません",
  missingWorkflowMessage: "Markdownに ```workflow で始まるコードブロックを追加してください。",
  workflowErrorHeading: "ワークフローを表示できません",
  unexpectedErrorHeading: "予期しないエラーが発生しました",
  previewAriaLabel: "ワークフロープレビュー",
});

export function createDefaultLocalizer() {
  return createLocalizer("ja", (key) => japaneseFallback[key]);
}

export function createVscodeLocalizer(vscode) {
  const locale = normalizeLocale(vscode.env.language);
  return createLocalizer(locale, (key) => {
    switch (key) {
      case "previewTitle": return vscode.l10n.t("Workflow Preview");
      case "openMarkdownHeading": return vscode.l10n.t("Open a Markdown file");
      case "openMarkdownMessage": return vscode.l10n.t("Preview the workflow code block in the active Markdown file.");
      case "missingWorkflowHeading": return vscode.l10n.t("No workflow block found");
      case "missingWorkflowMessage": return vscode.l10n.t("Add a code block beginning with ```workflow to the Markdown file.");
      case "workflowErrorHeading": return vscode.l10n.t("Unable to display the workflow");
      case "unexpectedErrorHeading": return vscode.l10n.t("An unexpected error occurred");
      case "previewAriaLabel": return vscode.l10n.t("Workflow preview");
      default: return key;
    }
  });
}

function createLocalizer(locale, message) {
  return Object.freeze({
    locale,
    message,
    workflowOptions: workflowLocaleOptions(locale),
    formatWorkflowError: (error) => formatWorkflowError(error, locale),
  });
}
