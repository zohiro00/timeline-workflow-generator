import assert from "node:assert/strict";
import test from "node:test";
import { generateWorkflowSvg, layoutWorkflow, parseWorkflow, renderWorkflowSvg, WorkflowError } from "../src/workflow.js";

const sample = `
\`\`\`workflow
title: 申請ワークフローの時系列図
lane: a申請
lane: b申請
lane: c申請
node a1: 作成 (lane: a申請)
node a2: 承認 (lane: a申請)
node a3: 保留 (lane: a申請)
node a4: 取消 (lane: a申請)
node b1: 作成 (lane: b申請)
node b2: 承認 (lane: b申請)
a1 -> a2
a2 -> b1
b1 -> b2
b1 -.-> a4
a2 -> a3 -> a4
\`\`\`
`;

test("parses workflow blocks from markdown", () => {
  const workflow = parseWorkflow(sample);
  assert.equal(workflow.title, "申請ワークフローの時系列図");
  assert.deepEqual(workflow.lanes, ["a申請", "b申請", "c申請"]);
  assert.equal(workflow.nodes.length, 6);
  assert.equal(workflow.edges.length, 6);
  assert.equal(workflow.edges[3].type, "dotted");
});

test("computes gridX by longest dependency path", () => {
  const workflow = layoutWorkflow(parseWorkflow(sample));
  const nodes = new Map(workflow.nodes.map((node) => [node.id, node]));
  assert.equal(nodes.get("a1").gridX, 0);
  assert.equal(nodes.get("a2").gridX, 1);
  assert.equal(nodes.get("b1").gridX, 2);
  assert.equal(nodes.get("b2").gridX, 3);
  assert.equal(nodes.get("a3").gridX, 2);
  assert.equal(nodes.get("a4").gridX, 3);
});

test("rejects cyclic dependencies", () => {
  assert.throws(
    () => layoutWorkflow(parseWorkflow(`
lane: main
node a: A (lane: main)
node b: B (lane: main)
a -> b
b -> a
`)),
    WorkflowError,
  );
});

test("renders svg with labels and connectors", () => {
  const svg = renderWorkflowSvg(layoutWorkflow(parseWorkflow(sample)));
  assert.match(svg, /<svg/);
  assert.match(svg, /申請ワークフロー/);
  assert.match(svg, /marker-end/);
  assert.match(svg, /edge-dotted/);
});

test("passes render options through generateWorkflowSvg", () => {
  const defaultSvg = generateWorkflowSvg(sample);
  const widerSvg = generateWorkflowSvg(sample, { gridXSize: 250 });

  assert.match(defaultSvg, /viewBox="0 0 912 454"/);
  assert.match(widerSvg, /viewBox="0 0 1098 454"/);
});

test("clips time lines near the last rendered lane", () => {
  const svg = renderWorkflowSvg(layoutWorkflow(parseWorkflow(sample)));

  assert.match(svg, /class="time-line"[^>]+y2="388"/);
});

test("separates multi-lane connector curves by lane pair", () => {
  const crossingSample = `
lane: top
lane: bottom
node a1: A1 (lane: top)
node a2: A2 (lane: top)
node b1: B1 (lane: bottom)
node b2: B2 (lane: bottom)
a1 -> b1
a2 -> b2
`;
  const svg = renderWorkflowSvg(layoutWorkflow(parseWorkflow(crossingSample)));

  assert.match(svg, /C 296 113, 284 229, 328 229/);
  assert.match(svg, /C 314 113, 266 229, 328 229/);
});

test("escapes svg text content", () => {
  const svg = renderWorkflowSvg(layoutWorkflow(parseWorkflow(`
title: <script>alert(1)</script>
lane: <Lane & One>
node a: <Node & One> (lane: <Lane & One>)
`)));

  assert.doesNotMatch(svg, /<script>/);
  assert.match(svg, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(svg, /&lt;Lane &amp; One&gt;/);
  assert.match(svg, /&lt;Node &amp; One&gt;/);
});
