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

test("parses a single node highlight without changing regular node data", () => {
  const source = `# Highlight

## lanes
- main: Main

## nodes
- main
  - a [highlight]: Focus
  - b: Next [highlight]

## workflow
- a -> b
`;
  const parsed = parseWorkflow(source);
  const regularSource = source.replace(" [highlight]", "");
  const regularLayout = layoutWorkflow(parseWorkflow(regularSource));
  const highlightedLayout = layoutWorkflow(parsed);

  assert.deepEqual(parsed.nodes[0], {
    id: "a",
    label: "Focus",
    laneId: "main",
    highlighted: true,
    gridX: 0,
    gridY: 0,
  });
  assert.deepEqual(parsed.nodes[1], {
    id: "b",
    label: "Next [highlight]",
    laneId: "main",
    gridX: 0,
    gridY: 0,
  });
  assert.deepEqual(
    highlightedLayout.nodes.map(({ id, gridX, gridY }) => ({ id, gridX, gridY })),
    regularLayout.nodes.map(({ id, gridX, gridY }) => ({ id, gridX, gridY })),
  );
  assert.deepEqual(highlightedLayout.edges, regularLayout.edges);
});

test("rejects multiple or unknown node highlight attributes", () => {
  assert.throws(
    () => parseWorkflow(`# Multiple highlights

## lanes
- main: Main

## nodes
- main
  - a [highlight]: A
  - b [highlight]: B

## workflow
- a -> b
`),
    /Line 9: `highlight` は1つのワークフローにつき1ノードだけ指定できます。すでにノード "a" が強調されています。/,
  );

  assert.throws(
    () => parseWorkflow(`# Unknown attribute

## lanes
- main: Main

## nodes
- main
  - a [focus]: A
  - b: B

## workflow
- a -> b
`),
    /Line 8: ノード属性 "focus" は使用できません。現在使用できる属性は `highlight` です。/,
  );
});

test("parses dotted line, cross, and invisible workflow edges", () => {
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
  - f: F

## workflow
- a -.- b -x- c .x. d
- d ~> e -> f
`);

  assert.deepEqual(workflow.edges, [
    { from: "a", to: "b", type: "dottedLine" },
    { from: "b", to: "c", type: "cross" },
    { from: "c", to: "d", type: "dottedCross" },
    { from: "d", to: "e", type: "invisible" },
    { from: "e", to: "f", type: "solid" },
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

test("renders only nodes referenced by workflow edges", () => {
  const source = `# ワークフロー名

## lanes
- lane1: レーン1
- lane2: レーン2

## nodes
- lane1
  - node1: ノード1
  - node11: x
- lane2
  - node2: ノード2

## workflow
- node1 -> node2
`;
  const parsed = parseWorkflow(source);
  const workflow = layoutWorkflow(parsed);
  const svg = renderWorkflowSvg(workflow);

  assert.equal(parsed.nodes.length, 3);
  assert.deepEqual(workflow.nodes.map((node) => node.id), ["node1", "node2"]);
  assert.equal([...svg.matchAll(/<g class="node"/g)].length, 2);
  assert.match(svg, />ノード1<\/tspan>/);
  assert.match(svg, />ノード2<\/tspan>/);
  assert.doesNotMatch(svg, />x<\/tspan>/);
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

test("renders dotted line edges without arrow markers", () => {
  const svg = renderWorkflowSvg(layoutWorkflow(parseWorkflow(`# Dotted line

## lanes
- main: Main

## nodes
- main
  - a: A
  - b: B

## workflow
- a -.- b
`)));

  assert.match(svg, /<path class="edge edge-dotted" d="M 252 137 L 328 137" \/>/);
  assert.doesNotMatch(svg, /marker-end="url\(#arrow\)"/);
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
  assert.match(svg, /\.edge-cross-mark-background \{ fill: #ffffff; \}/);
  assert.match(svg, /<circle class="edge-cross-mark-background" r="13" \/>/);
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

test("renders only the highlighted node with the isolated highlight style", () => {
  const svg = renderWorkflowSvg(layoutWorkflow(parseWorkflow(`# Highlight render

## lanes
- main: Main

## nodes
- main
  - a [highlight]: Focus
  - b: Next

## workflow
- a -> b
`)), { theme: "consulting-blue-fill" });

  assert.match(svg, /<g class="node node-highlighted" transform="translate\(140, 116\)">/);
  assert.match(svg, /<g class="node" transform="translate\(328, 116\)">/);
  assert.match(svg, /\.node-highlighted rect \{ fill: #fcecec; stroke: #c65a5a; stroke-width: 4; \}/);
  assert.match(svg, /\.node-highlighted text \{ fill: #4a2020; \}/);
  assert.match(svg, /\.node rect \{ fill: #1f4e79; stroke: #1f4e79; stroke-width: 2; \}/);
});

test("exports renderer defaults for UI settings", () => {
  assert.deepEqual(
    {
      gridXSize: workflowSvgDefaults.gridXSize,
      gridYSize: workflowSvgDefaults.gridYSize,
      nodeWidth: workflowSvgDefaults.nodeWidth,
      nodeHeight: workflowSvgDefaults.nodeHeight,
      showTimeLabels: workflowSvgDefaults.showTimeLabels,
      labelFitStrategy: workflowSvgDefaults.labelFitStrategy,
    },
    {
      gridXSize: 188,
      gridYSize: 116,
      nodeWidth: 112,
      nodeHeight: 42,
      showTimeLabels: true,
      labelFitStrategy: "wrap-first",
    },
  );
});

test("renders filled blue and gray outline themes", () => {
  const workflow = layoutWorkflow(parseWorkflow(sample));
  const filledBlueSvg = renderWorkflowSvg(workflow, { theme: "consulting-blue-fill" });
  const graySvg = renderWorkflowSvg(workflow, { theme: "consulting-gray-outline" });
  const filledGraySvg = renderWorkflowSvg(workflow, { theme: "consulting-gray-fill" });

  assert.match(filledBlueSvg, /\.node rect \{ fill: #1f4e79; stroke: #1f4e79; stroke-width: 2; \}/);
  assert.match(filledBlueSvg, /\.node text \{ fill: #ffffff;/);
  assert.match(graySvg, /fill="#595959"/);
  assert.match(graySvg, /\.edge \{ fill: none; stroke: #595959; stroke-width: 2\.4; \}/);
  assert.match(graySvg, /\.edge-cross-mark-background \{ fill: #ffffff; \}/);
  assert.match(graySvg, /\.node rect \{ fill: #ffffff; stroke: #595959; stroke-width: 2; \}/);
  assert.match(filledGraySvg, /\.node rect \{ fill: #595959; stroke: #595959; stroke-width: 2; \}/);
  assert.match(filledGraySvg, /\.node text \{ fill: #ffffff;/);
});

test("does not override calculated label font sizes in embedded CSS", () => {
  const svg = renderWorkflowSvg(layoutWorkflow(parseWorkflow(sample)));

  assert.doesNotMatch(svg, /\.node text\s*\{[^}]*font-size:/);
  assert.doesNotMatch(svg, /\.lane-label\s*\{[^}]*font-size:/);
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
  assert.match(svg, /class="time-label" x="196" y="68">Step 1<\/text>/);
});

test("can hide time labels while keeping time lines", () => {
  const svg = renderWorkflowSvg(layoutWorkflow(parseWorkflow(sample)), { showTimeLabels: false });

  assert.doesNotMatch(svg, /class="time-label"/);
  assert.doesNotMatch(svg, />Step 1<\/text>/);
  assert.match(svg, /class="time-line"/);
});

test("wraps long node labels before shrinking by default", () => {
  const svg = renderWorkflowSvg(layoutWorkflow(parseWorkflow(`# Long labels

## lanes
- main: Main

## nodes
- main
  - a: 長い長い長い長い長い
  - b: Done

## workflow
- a -> b
`)));

  assert.match(svg, /<text x="56" y="21" font-size="14"><tspan x="56" dy="-3\.6">長い長い長い<\/tspan><tspan x="56" dy="17">長い長い<\/tspan><\/text>/);
});

test("can shrink long node labels before wrapping", () => {
  const svg = renderWorkflowSvg(layoutWorkflow(parseWorkflow(`# Shrink labels

## lanes
- main: Main

## nodes
- main
  - a: ABCDEFGHIJKL
  - b: Done

## workflow
- a -> b
`)), { labelFitStrategy: "shrink-first" });

  assert.match(svg, /<text x="56" y="21" font-size="12"><tspan x="56" dy="4\.2">ABCDEFGHIJKL<\/tspan><\/text>/);
});

test("renders explicit label line breaks with tspans", () => {
  const svg = renderWorkflowSvg(layoutWorkflow(parseWorkflow(`# Manual breaks

## lanes
- lane_1: 営業<br>承認

## nodes
- lane_1
  - a: 見積<br>承認
  - b: Done

## workflow
- a -> b
`)));

  assert.match(svg, /<text class="lane-label" x="24" y="137" font-size="14"><tspan x="24" dy="-3\.6">営業<\/tspan><tspan x="24" dy="17">承認<\/tspan><\/text>/);
  assert.match(svg, /<text x="56" y="21" font-size="14"><tspan x="56" dy="-3\.6">見積<\/tspan><tspan x="56" dy="17">承認<\/tspan><\/text>/);
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

test("keeps non-br tag-like label text escaped", () => {
  const svg = renderWorkflowSvg(layoutWorkflow(parseWorkflow(`# Escaped breaks

## lanes
- lane_1: Safe<br/>Lane

## nodes
- lane_1
  - a: Safe<br/>Break
  - b: Done

## workflow
- a -> b
`)), { nodeWidth: 220 });

  assert.match(svg, /Safe&lt;br\/&gt;La/);
  assert.match(svg, /Safe&lt;br\/&gt;Break/);
});
