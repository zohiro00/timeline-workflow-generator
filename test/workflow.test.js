import assert from "node:assert/strict";
import test from "node:test";
import { layoutWorkflow, parseWorkflow, renderWorkflowSvg, WorkflowError } from "../src/workflow.js";

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
