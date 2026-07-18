import {
  extractWorkflowBlocks,
  layoutWorkflow,
  parseWorkflow,
  renderWorkflowSvg,
  WorkflowError,
} from "../../src/workflow.js";
import { createDefaultLocalizer } from "./localization.js";

export function createNoMarkdownState(localizer = createDefaultLocalizer()) {
  return {
    kind: "no-markdown",
    title: localizer.message("previewTitle"),
    heading: localizer.message("openMarkdownHeading"),
    message: localizer.message("openMarkdownMessage"),
  };
}

export function createPreviewState(markdown, documentName, localizer = createDefaultLocalizer()) {
  const previewTitle = localizer.message("previewTitle");
  const title = documentName ? `${previewTitle} — ${documentName}` : previewTitle;

  try {
    if (extractWorkflowBlocks(markdown).length === 0) {
      return {
        kind: "no-workflow",
        title,
        heading: localizer.message("missingWorkflowHeading"),
        message: localizer.message("missingWorkflowMessage"),
      };
    }

    const workflow = layoutWorkflow(parseWorkflow(markdown, { defaultTitle: localizer.workflowOptions.defaultTitle }));
    return {
      kind: "ready",
      title,
      documentName,
      svg: renderWorkflowSvg(workflow, { formatTimeLabel: localizer.workflowOptions.formatTimeLabel }),
    };
  } catch (error) {
    if (error instanceof WorkflowError) {
      return {
        kind: "workflow-error",
        title,
        heading: localizer.message("workflowErrorHeading"),
        message: localizer.formatWorkflowError(error),
      };
    }

    return {
      kind: "unexpected-error",
      title,
      heading: localizer.message("unexpectedErrorHeading"),
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
