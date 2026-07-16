import {
  extractWorkflowBlocks,
  layoutWorkflow,
  parseWorkflow,
  renderWorkflowSvg,
  WorkflowError,
} from "../../src/workflow.js";

export function createNoMarkdownState() {
  return {
    kind: "no-markdown",
    title: "Workflow Preview",
    heading: "Markdownファイルを開いてください",
    message: "アクティブなMarkdownファイルに含まれる workflow コードブロックをプレビューします。",
  };
}

export function createPreviewState(markdown, documentName) {
  const title = documentName ? `Workflow Preview — ${documentName}` : "Workflow Preview";

  try {
    if (extractWorkflowBlocks(markdown).length === 0) {
      return {
        kind: "no-workflow",
        title,
        heading: "workflow ブロックが見つかりません",
        message: "Markdownに ```workflow で始まるコードブロックを追加してください。",
      };
    }

    const workflow = layoutWorkflow(parseWorkflow(markdown));
    return {
      kind: "ready",
      title,
      documentName,
      svg: renderWorkflowSvg(workflow),
    };
  } catch (error) {
    if (error instanceof WorkflowError) {
      return {
        kind: "workflow-error",
        title,
        heading: "ワークフローを表示できません",
        message: error.message,
      };
    }

    return {
      kind: "unexpected-error",
      title,
      heading: "予期しないエラーが発生しました",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
