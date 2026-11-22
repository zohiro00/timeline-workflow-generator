import test from "node:test";
import assert from "node:assert/strict";
import { createWorkflowHtml } from "../src/workflow-html.js";
import { layoutWorkflow, parseWorkflow, renderWorkflowSvg } from "../src/workflow.js";

const source = `# HTML出力
## lanes
- author: 作成者
## nodes
- author
  - first: 作成
  - last: 完了
## workflow
- first -> last`;

test("standalone HTML embeds the existing rendered SVG without external dependencies", () => {
  const svg = renderWorkflowSvg(layoutWorkflow(parseWorkflow(source)));
  const html = createWorkflowHtml(svg);
  assert.match(html, /^<!doctype html>/);
  assert.ok(html.includes(svg.trim()));
  assert.match(html, /<meta name="viewport"/);
  assert.match(html, /\.workflow-diagram/);
  assert.doesNotMatch(html, /<script\b|<link\b|<iframe\b/);
});

test("HTML export rejects missing or non-SVG content", () => {
  assert.throws(() => createWorkflowHtml(""), TypeError);
  assert.throws(() => createWorkflowHtml("<div>bad</div>"), TypeError);
});
