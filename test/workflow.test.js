import assert from "node:assert/strict";
import test from "node:test";
import { sampleWorkflowSource, workflowExamples } from "../src/sample-workflow.js";
import {
  generateWorkflowSvg,
  layoutWorkflow,
  parseWorkflow,
  renderWorkflowSvg,
  WorkflowError,
  workflowSvgDefaults,
} from "../src/workflow.js";

const sample = sampleWorkflowSource;
const markdownSample = `# Markdownの中に workflow ブロックを書けます

\`\`\`workflow
${sample}
\`\`\``;

test("parses workflow blocks from markdown", () => {
  const workflow = parseWorkflow(markdownSample);
  assert.equal(workflow.title, "購買申請ワークフロー");
  assert.deepEqual(workflow.lanes, [
    { id: "requester", label: "申請者" },
    { id: "manager", label: "上長" },
    { id: "finance", label: "経理" },
    { id: "purchasing", label: "購買" },
  ]);
  assert.deepEqual(workflow.nodes.find((node) => node.id === "draft"), {
    id: "draft",
    label: "申請作成",
    laneId: "requester",
    gridX: 0,
    gridY: 0,
  });
  assert.equal(workflow.nodes.length, 8);
  assert.equal(workflow.edges.length, 8);
  assert.equal(workflow.edges[1].type, "dotted");
  assert.equal(workflow.edges[2].type, "cross");
  assert.equal(workflow.edges[6].type, "dottedCross");
  assert.equal(workflow.edges[7].type, "invisible");
});

test("example workflows parse and render", () => {
  assert.equal(workflowExamples.length, 4);

  for (const example of workflowExamples) {
    const workflow = layoutWorkflow(parseWorkflow(example.source));
    const svg = renderWorkflowSvg(workflow);

    assert.equal(workflow.title, example.source.match(/^#\s+(.+)$/m)?.[1]);
    assert.ok(workflow.nodes.length >= 5);
    assert.match(svg, /<svg/);
  }
});

test("keeps markdown headings and %% comments distinct", () => {
  const workflow = parseWorkflow(`# コメントではないタイトル

## lanes
- main: メイン # ラベル内の文字 %% ここはコメント

## nodes
- main
  - a: 作成 #1
  - b: 承認

## workflow
- a -> b %% コメント
`);

  assert.equal(workflow.title, "コメントではないタイトル");
  assert.deepEqual(workflow.lanes, [{ id: "main", label: "メイン # ラベル内の文字" }]);
  assert.equal(workflow.nodes[0].label, "作成 #1");
  assert.deepEqual(workflow.edges, [{ from: "a", to: "b", type: "solid" }]);
});

test("parses cross and invisible workflow edges", () => {
  const workflow = parseWorkflow(`# Edge types

## lanes
- main: Main

## nodes
- main
  - a: A
  - b: B
  - c: C
  - d: D
  - e: E

## workflow
- a -x- b .x. c
- c ~> d -> e
`);

  assert.deepEqual(workflow.edges, [
    { from: "a", to: "b", type: "cross" },
    { from: "b", to: "c", type: "dottedCross" },
    { from: "c", to: "d", type: "invisible" },
    { from: "d", to: "e", type: "solid" },
  ]);
});

test("computes gridX by longest dependency path", () => {
  const workflow = layoutWorkflow(parseWorkflow(sample));
  const nodes = new Map(workflow.nodes.map((node) => [node.id, node]));
  assert.equal(nodes.get("draft").gridX, 0);
  assert.equal(nodes.get("review").gridX, 1);
  assert.equal(nodes.get("revise").gridX, 2);
  assert.equal(nodes.get("rejected").gridX, 2);
  assert.equal(nodes.get("budget").gridX, 3);
  assert.equal(nodes.get("over_budget").gridX, 4);
  assert.equal(nodes.get("order").gridX, 4);
  assert.equal(nodes.get("received").gridX, 5);
  assert.equal(nodes.get("review").gridY, 1);
});

test("uses invisible edges for layout and cycle detection", () => {
  const workflow = layoutWorkflow(parseWorkflow(`# Invisible layout

## lanes
- main: Main

## nodes
- main
  - a: A
  - b: B
  - c: C

## workflow
- a ~> b -> c
`));
  const nodes = new Map(workflow.nodes.map((node) => [node.id, node]));

  assert.equal(nodes.get("a").gridX, 0);
  assert.equal(nodes.get("b").gridX, 1);
  assert.equal(nodes.get("c").gridX, 2);

  assert.throws(
    () => layoutWorkflow(parseWorkflow(`# Invisible cycle

## lanes
- main: Main

## nodes
- main
  - a: A
  - b: B

## workflow
- a ~> b
- b -> a
`)),
    WorkflowError,
  );
});

test("rejects cyclic dependencies", () => {
  assert.throws(
    () => layoutWorkflow(parseWorkflow(`# Cycle

## lanes
- main: Main

## nodes
- main
  - a: A
  - b: B

## workflow
- a -> b
- b -> a
`)),
    WorkflowError,
  );
});

test("rejects missing required sections", () => {
  assert.throws(
    () => parseWorkflow(`# Missing lanes

## nodes
- main
  - a: A

## workflow
- a -> a
`),
    /`## lanes` セクションを定義してください。/,
  );

  assert.throws(
    () => parseWorkflow(`# Missing nodes

## lanes
- main: Main

## workflow
- a -> a
`),
    /`## nodes` セクションを定義してください。/,
  );

  assert.throws(
    () => parseWorkflow(`# Missing workflow

## lanes
- main: Main

## nodes
- main
  - a: A
`),
    /`## workflow` セクションを定義してください。/,
  );
});

test("rejects duplicate and empty lane definitions with line numbers", () => {
  assert.throws(
    () => parseWorkflow(`# Duplicate lane

## lanes
- main: Main
- main: Other

## nodes
- main
  - a: A

## workflow
- a -> a
`),
    /Line 5: レーンID "main" が重複しています。/,
  );

  assert.throws(
    () => parseWorkflow(`# Empty lane

## lanes
- main:

## nodes
- main
  - a: A

## workflow
- a -> a
`),
    /Line 4: レーン名が空です。/,
  );
});

test("rejects duplicate, empty, and unscoped node definitions", () => {
  assert.throws(
    () => parseWorkflow(`# Duplicate node

## lanes
- main: Main

## nodes
- main
  - a: A
  - a: Other

## workflow
- a -> a
`),
    /Line 9: ノードID "a" が重複しています。/,
  );

  assert.throws(
    () => parseWorkflow(`# Empty node

## lanes
- main: Main

## nodes
- main
  - a:

## workflow
- a -> a
`),
    /Line 8: ノード名が空です。/,
  );

  assert.throws(
    () => parseWorkflow(`# Bad indent

## lanes
- main: Main

## nodes
  - a: A

## workflow
- a -> a
`),
    /Line 7: ノードは所属レーンの配下に記述してください。/,
  );
});

test("rejects undefined lanes and nodes", () => {
  assert.throws(
    () => parseWorkflow(`# Undefined lane

## lanes
- main: Main

## nodes
- missing
  - a: A

## workflow
- a -> a
`),
    /ノード "a" のレーン "missing" が定義されていません。/,
  );

  assert.throws(
    () => parseWorkflow(`# Undefined node

## lanes
- main: Main

## nodes
- main
  - a: A

## workflow
- a -> b
`),
    /エッジの終了ノード "b" が定義されていません。/,
  );
});

test("rejects invalid lines with line numbers", () => {
  assert.throws(
    () => parseWorkflow(`# Invalid

## lanes
- main Main

## nodes
- main
  - a: A

## workflow
- a -> a
`),
    /Line 4: レーンは `- laneId: レーン名` の形式で記述してください。/,
  );
});

test("renders svg with labels and connectors", () => {
  const svg = renderWorkflowSvg(layoutWorkflow(parseWorkflow(sample)));
  assert.match(svg, /<svg/);
  assert.match(svg, /購買申請ワークフロー/);
  assert.match(svg, /申請者/);
  assert.match(svg, /marker-end/);
  assert.match(svg, /edge-dotted/);
  assert.match(svg, /edge-cross-mark/);
  assert.match(svg, /class="edge edge-dotted"/);
});

test("renders cross edge types without arrow markers and hides invisible edges", () => {
  const svg = renderWorkflowSvg(layoutWorkflow(parseWorkflow(`# Render edge types

## lanes
- main: Main

## nodes
- main
  - a: A
  - b: B
  - c: C
  - d: D

## workflow
- a -x- b .x. c ~> d
`)));

  assert.match(svg, /edge-cross-mark/);
  assert.match(svg, /translate\(290, 137\) rotate\(45\)/);
  assert.match(svg, /<path class="edge edge-dotted" d="M 440 137 L 516 137" \/>/);
  assert.doesNotMatch(svg, /marker-end="url\(#arrow\)"/);
  assert.equal([...svg.matchAll(/<path class="edge/g)].length, 2);
});

test("places cross marks at the center of connector paths", () => {
  const svg = renderWorkflowSvg(layoutWorkflow(parseWorkflow(`# Cross mark center

## lanes
- a: P1
- b: P2
- c: P3

## nodes
- a
  - a1: 申請作成
  - a2: 申請
  - a3: 修正
  - a4: 社内連絡
- b
  - b1: 却下
  - b2: 承認
- c
  - c1: 承認

## workflow
- a1 -> a2
- a2 -> b1
- b1 -> a3
- b1 .x. c1
- a3 -> b2
- b2 -> c1
- c1 -> a4
`)));

  assert.match(svg, /<path class="edge edge-dotted" d="M 628 253 C 676 253, 1032 369, 1080 369" \/>/);
  assert.match(svg, /<g class="edge-cross-mark" transform="translate\(854, 311\) rotate\(45\)">/);
});

test("uses consulting blue outline theme by default", () => {
  const svg = renderWorkflowSvg(layoutWorkflow(parseWorkflow(sample)));

  assert.match(svg, /fill="#1f4e79"/);
  assert.match(svg, /\.edge \{ fill: none; stroke: #1f4e79; stroke-width: 2\.4; \}/);
  assert.match(svg, /\.node rect \{ fill: #ffffff; stroke: #1f4e79; stroke-width: 2; \}/);
  assert.doesNotMatch(svg, /#d24726/);
});

test("exports renderer defaults for UI settings", () => {
  assert.deepEqual(
    {
      gridXSize: workflowSvgDefaults.gridXSize,
      gridYSize: workflowSvgDefaults.gridYSize,
      nodeWidth: workflowSvgDefaults.nodeWidth,
      nodeHeight: workflowSvgDefaults.nodeHeight,
    },
    {
      gridXSize: 188,
      gridYSize: 116,
      nodeWidth: 112,
      nodeHeight: 42,
    },
  );
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

  assert.match(defaultSvg, /viewBox="0 0 1288 594"/);
  assert.match(widerSvg, /viewBox="0 0 1598 594"/);
});

test("clips time lines near the last rendered lane", () => {
  const svg = renderWorkflowSvg(layoutWorkflow(parseWorkflow(sample)));

  assert.match(svg, /class="time-line"[^>]+y2="528"/);
});

test("keeps title and time labels vertically separated", () => {
  const svg = renderWorkflowSvg(layoutWorkflow(parseWorkflow(sample)));

  assert.match(svg, /<text x="24" y="38"[^>]*>購買申請ワークフロー<\/text>/);
  assert.match(svg, /class="time-label" x="196" y="68">T0<\/text>/);
});

test("separates multi-lane connector curves by lane pair", () => {
  const crossingSample = `# Crossing

## lanes
- top: Top
- bottom: Bottom

## nodes
- top
  - a1: A1
  - a2: A2
- bottom
  - b1: B1
  - b2: B2

## workflow
- a1 -> b1
- a2 -> b2
`;
  const svg = renderWorkflowSvg(layoutWorkflow(parseWorkflow(crossingSample)));

  assert.match(svg, /C 296 137, 284 253, 328 253/);
  assert.match(svg, /C 314 137, 266 253, 328 253/);
});

test("escapes svg text content", () => {
  const svg = renderWorkflowSvg(layoutWorkflow(parseWorkflow(`# <script>alert(1)</script>

## lanes
- lane_1: <Lane & One>

## nodes
- lane_1
  - a: <Node & One>
  - b: Done

## workflow
- a -> b
`)));

  assert.doesNotMatch(svg, /<script>/);
  assert.match(svg, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(svg, /&lt;Lane &amp; One&gt;/);
  assert.match(svg, /&lt;Node &amp; One&gt;/);
});
