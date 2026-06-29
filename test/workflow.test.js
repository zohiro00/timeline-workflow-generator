import assert from "node:assert/strict";
import test from "node:test";
import { sampleWorkflowSource } from "../src/sample-workflow.js";
import { generateWorkflowSvg, layoutWorkflow, parseWorkflow, renderWorkflowSvg, WorkflowError } from "../src/workflow.js";

const sample = sampleWorkflowSource;
const markdownSample = `# Markdownの中に workflow ブロックを書けます

\`\`\`workflow
${sample}
\`\`\``;

test("parses workflow blocks from markdown", () => {
  const workflow = parseWorkflow(markdownSample);
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

test("uses consulting blue outline theme by default", () => {
  const svg = renderWorkflowSvg(layoutWorkflow(parseWorkflow(sample)));

  assert.match(svg, /fill="#1f4e79"/);
  assert.match(svg, /\.edge \{ fill: none; stroke: #1f4e79; stroke-width: 2\.4; \}/);
  assert.match(svg, /\.node rect \{ fill: #ffffff; stroke: #1f4e79; stroke-width: 2; \}/);
  assert.doesNotMatch(svg, /#d24726/);
});

test("renders filled blue and gray outline themes", () => {
  const workflow = layoutWorkflow(parseWorkflow(sample));
  const filledBlueSvg = renderWorkflowSvg(workflow, { theme: "consulting-blue-fill" });
  const graySvg = renderWorkflowSvg(workflow, { theme: "consulting-gray-outline" });
  const filledGraySvg = renderWorkflowSvg(workflow, { theme: "consulting-gray-fill" });

  assert.match(filledBlueSvg, /\.node rect \{ fill: #1f4e79; stroke: #1f4e79; stroke-width: 2; \}/);
  assert.match(filledBlueSvg, /\.node text \{ fill: #ffffff; font-size: 14px;/);
  assert.match(graySvg, /fill="#595959"/);
  assert.match(graySvg, /\.edge \{ fill: none; stroke: #595959; stroke-width: 2\.4; \}/);
  assert.match(graySvg, /\.node rect \{ fill: #ffffff; stroke: #595959; stroke-width: 2; \}/);
  assert.match(filledGraySvg, /\.node rect \{ fill: #595959; stroke: #595959; stroke-width: 2; \}/);
  assert.match(filledGraySvg, /\.node text \{ fill: #ffffff; font-size: 14px;/);
});

test("passes render options through generateWorkflowSvg", () => {
  const defaultSvg = generateWorkflowSvg(sample);
  const widerSvg = generateWorkflowSvg(sample, { gridXSize: 250 });

  assert.match(defaultSvg, /viewBox="0 0 912 478"/);
  assert.match(widerSvg, /viewBox="0 0 1098 478"/);
});

test("clips time lines near the last rendered lane", () => {
  const svg = renderWorkflowSvg(layoutWorkflow(parseWorkflow(sample)));

  assert.match(svg, /class="time-line"[^>]+y2="412"/);
});

test("keeps title and time labels vertically separated", () => {
  const svg = renderWorkflowSvg(layoutWorkflow(parseWorkflow(sample)));

  assert.match(svg, /<text x="24" y="38"[^>]*>申請ワークフローの時系列図<\/text>/);
  assert.match(svg, /class="time-label" x="196" y="68">T0<\/text>/);
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

  assert.match(svg, /C 296 137, 284 253, 328 253/);
  assert.match(svg, /C 314 137, 266 253, 328 253/);
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
