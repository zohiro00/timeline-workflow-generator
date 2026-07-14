import assert from "node:assert/strict";
import test from "node:test";
import { createNoMarkdownState, createPreviewState } from "../src/preview-state.js";

const validBlock = `\`\`\`workflow
# Purchase Approval

## lanes
- requester: Requester
- manager: Manager

## nodes
- requester
  - draft: Create request
- manager
  - review: Review

## workflow
- draft -> review
\`\`\``;

test("creates guidance when there is no active Markdown document", () => {
  assert.deepEqual(createNoMarkdownState(), {
    kind: "no-markdown",
    title: "Workflow Preview",
    heading: "Markdownファイルを開いてください",
    message: "アクティブなMarkdownファイルに含まれる workflow コードブロックをプレビューします。",
  });
});

test("renders only the first workflow block", () => {
  const state = createPreviewState(`${validBlock}\n\n${validBlock.replace("Purchase Approval", "Ignored")}`, "approval.md");

  assert.equal(state.kind, "ready");
  assert.equal(state.title, "Workflow Preview — approval.md");
  assert.match(state.svg, /Purchase Approval/);
  assert.doesNotMatch(state.svg, /Ignored/);
});

test("creates guidance when a workflow block is missing", () => {
  const state = createPreviewState("# Ordinary Markdown", "notes.md");

  assert.equal(state.kind, "no-workflow");
  assert.equal(state.heading, "workflow ブロックが見つかりません");
});

test("returns WorkflowError messages with Markdown line numbers", () => {
  const state = createPreviewState(`Intro\n\n\`\`\`workflow\n# Invalid\n\n## lanes\n- lane: Lane\n\n## nodes\n- lane\n  - start: Start\n\n## workflow\n- start => missing\n\`\`\``, "invalid.md");

  assert.equal(state.kind, "workflow-error");
  assert.match(state.message, /^Line 14:/);
  assert.match(state.message, /依存関係/);
});

test("converts unexpected failures into a safe display state", () => {
  const state = createPreviewState({
    toString() {
      throw new Error("broken input");
    },
  }, "broken.md");

  assert.equal(state.kind, "unexpected-error");
  assert.equal(state.heading, "予期しないエラーが発生しました");
  assert.equal(typeof state.message, "string");
});
