const EDGE_DEFINITIONS = [
  { token: "->", type: "solid", marker: "arrow" },
  { token: "-.->", type: "dotted", marker: "arrow", dotted: true },
  { token: "-x-", type: "cross", marker: "cross" },
  { token: ".x.", type: "dottedCross", marker: "cross", dotted: true },
  { token: "~>", type: "invisible", visible: false },
];
const EDGE_TOKEN_PATTERN = new RegExp(`(${EDGE_DEFINITIONS.map((edge) => escapeRegExp(edge.token)).join("|")})`, "g");
const EDGE_DEFINITIONS_BY_TOKEN = new Map(EDGE_DEFINITIONS.map((edge) => [edge.token, edge]));
const EDGE_DEFINITIONS_BY_TYPE = new Map(EDGE_DEFINITIONS.map((edge) => [edge.type, edge]));
const EDGE_USAGE = EDGE_DEFINITIONS.map((edge) => `a ${edge.token} b`).join("`、`");
const WORKFLOW_SECTIONS = new Set(["lanes", "nodes", "workflow"]);
const defaultThemeId = "consulting-blue-outline";
const themeColor = {
  consultingBlue: "#1f4e79",
  consultingText: "#1f2937",
  gray: "#595959",
  grayText: "#262626",
};
const workflowThemes = {
  "consulting-blue-outline": {
    background: "#ffffff",
    laneLine: "#d8dde6",
    laneLabel: "#44546a",
    timeLine: "#e3e7ee",
    timeLabel: "#6f7f95",
    edge: themeColor.consultingBlue,
    nodeFill: "#ffffff",
    nodeStroke: themeColor.consultingBlue,
    nodeText: themeColor.consultingText,
    title: themeColor.consultingText,
  },
  "consulting-blue-fill": {
    background: "#ffffff",
    laneLine: "#d8dde6",
    laneLabel: "#44546a",
    timeLine: "#e3e7ee",
    timeLabel: "#6f7f95",
    edge: themeColor.consultingBlue,
    nodeFill: themeColor.consultingBlue,
    nodeStroke: themeColor.consultingBlue,
    nodeText: "#ffffff",
    title: themeColor.consultingText,
  },
  "consulting-gray-outline": {
    background: "#ffffff",
    laneLine: "#d7d7d7",
    laneLabel: themeColor.gray,
    timeLine: "#e5e5e5",
    timeLabel: "#7f7f7f",
    edge: themeColor.gray,
    nodeFill: "#ffffff",
    nodeStroke: themeColor.gray,
    nodeText: themeColor.grayText,
    title: themeColor.grayText,
  },
  "consulting-gray-fill": {
    background: "#ffffff",
    laneLine: "#d7d7d7",
    laneLabel: themeColor.gray,
    timeLine: "#e5e5e5",
    timeLabel: "#7f7f7f",
    edge: themeColor.gray,
    nodeFill: themeColor.gray,
    nodeStroke: themeColor.gray,
    nodeText: "#ffffff",
    title: themeColor.grayText,
  },
};

export class WorkflowError extends Error {
  constructor(message, line = null) {
    super(line == null ? message : `Line ${line}: ${message}`);
    this.name = "WorkflowError";
    this.line = line;
  }
}

export function extractWorkflowBlocks(markdown) {
  const blocks = [];
  const blockPattern = /```workflow\s*([\s\S]*?)```/g;
  let match;

  while ((match = blockPattern.exec(markdown)) !== null) {
    const before = markdown.slice(0, match.index);
    const startLine = before.split(/\r?\n/).length;
    blocks.push({ source: match[1].trim(), startLine });
  }

  return blocks;
}

export function parseWorkflow(input) {
  const blocks = extractWorkflowBlocks(input);
  const source = blocks.length > 0 ? blocks[0].source : input.trim();
  const lineOffset = blocks.length > 0 ? blocks[0].startLine : 0;
  const lanes = [];
  const laneSet = new Set();
  const nodes = new Map();
  const edges = [];
  let title = "時系列ワークフロー";
  let currentSection = null;
  let currentNodeLaneId = null;
  const seenSections = new Set();

  source.split(/\r?\n/).forEach((rawLine, index) => {
    const lineNo = lineOffset + index + 1;
    const withoutComment = stripComment(rawLine);
    const trimmed = withoutComment.trim();
    if (!trimmed) return;

    if (trimmed.startsWith("# ")) {
      const nextTitle = trimmed.slice(2).trim();
      if (!nextTitle) throw new WorkflowError("タイトルが空です。", lineNo);
      title = nextTitle;
      return;
    }

    if (trimmed.startsWith("## ")) {
      const section = trimmed.slice(3).trim().toLowerCase();
      if (!WORKFLOW_SECTIONS.has(section)) {
        throw new WorkflowError("セクションは `## lanes`、`## nodes`、`## workflow` のいずれかで記述してください。", lineNo);
      }
      currentSection = section;
      currentNodeLaneId = null;
      seenSections.add(section);
      return;
    }

    if (!currentSection) {
      throw new WorkflowError("`## lanes`、`## nodes`、`## workflow` のいずれかのセクション内に記述してください。", lineNo);
    }

    if (currentSection === "lanes") {
      const match = trimmed.match(/^-\s+([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
      if (!match) throw new WorkflowError("レーンは `- laneId: レーン名` の形式で記述してください。", lineNo);
      const [, id, rawLabel] = match;
      const label = rawLabel.trim();
      if (!label) throw new WorkflowError("レーン名が空です。", lineNo);
      if (laneSet.has(id)) throw new WorkflowError(`レーンID "${id}" が重複しています。`, lineNo);
      laneSet.add(id);
      lanes.push({ id, label });
      return;
    }

    if (currentSection === "nodes") {
      const nodeMatch = withoutComment.match(/^  -\s+([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
      if (nodeMatch) {
        const [, id, rawLabel] = nodeMatch;
        const label = rawLabel.trim();
        if (!currentNodeLaneId) throw new WorkflowError("ノードは所属レーンの配下に記述してください。", lineNo);
        if (!label) throw new WorkflowError("ノード名が空です。", lineNo);
        if (nodes.has(id)) throw new WorkflowError(`ノードID "${id}" が重複しています。`, lineNo);
        nodes.set(id, { id, label, laneId: currentNodeLaneId, gridX: 0, gridY: 0 });
        return;
      }

      const laneMatch = trimmed.match(/^-\s+([A-Za-z0-9_-]+)\s*$/);
      if (laneMatch) {
        const [, laneId] = laneMatch;
        currentNodeLaneId = laneId;
        return;
      }

      throw new WorkflowError("nodes は `- laneId` と、その配下の `  - nodeId: ノード名` の形式で記述してください。", lineNo);
    }

    if (currentSection === "workflow") {
      const match = trimmed.match(/^-\s+(.+)$/);
      if (!match) throw new WorkflowError("workflow は `- a -> b` の形式で記述してください。", lineNo);
      edges.push(...parseEdgeChain(match[1].trim(), lineNo));
      return;
    }

    throw new WorkflowError("解釈できない行です。", lineNo);
  });

  validateWorkflow({ lanes, nodes, edges, seenSections });

  return {
    title,
    lanes,
    nodes: Array.from(nodes.values()),
    edges,
  };
}

export function layoutWorkflow(workflow) {
  const laneIndex = new Map(workflow.lanes.map((lane, index) => [lane.id, index]));
  const nodes = new Map(workflow.nodes.map((node) => [node.id, { ...node }]));
  const incoming = new Map(workflow.nodes.map((node) => [node.id, []]));
  const outgoing = new Map(workflow.nodes.map((node) => [node.id, []]));

  workflow.edges.forEach((edge) => {
    incoming.get(edge.to).push(edge.from);
    outgoing.get(edge.from).push(edge.to);
  });

  const indegree = new Map(Array.from(incoming, ([id, from]) => [id, from.length]));
  const queue = workflow.nodes.filter((node) => indegree.get(node.id) === 0).map((node) => node.id);
  const ordered = [];

  while (queue.length > 0) {
    const id = queue.shift();
    ordered.push(id);
    for (const next of outgoing.get(id)) {
      const nextDegree = indegree.get(next) - 1;
      indegree.set(next, nextDegree);
      if (nextDegree === 0) queue.push(next);
    }
  }

  if (ordered.length !== workflow.nodes.length) {
    throw new WorkflowError("依存関係に循環があります。DAGになるように矢印を見直してください。");
  }

  for (const id of ordered) {
    const node = nodes.get(id);
    const parents = incoming.get(id);
    node.gridX = parents.length === 0 ? 0 : Math.max(...parents.map((parent) => nodes.get(parent).gridX)) + 1;
    node.gridY = laneIndex.get(node.laneId);
  }

  return {
    ...workflow,
    nodes: Array.from(nodes.values()),
  };
}

export function renderWorkflowSvg(workflow, options = {}) {
  const config = {
    paddingLeft: 140,
    paddingTop: 116,
    paddingRight: 96,
    paddingBottom: 88,
    gridXSize: 188,
    gridYSize: 116,
    nodeWidth: 112,
    nodeHeight: 42,
    ...options,
  };
  const theme = workflowThemes[config.theme] ?? workflowThemes[defaultThemeId];
  const nodeById = new Map(workflow.nodes.map((node) => [node.id, node]));
  const maxGridX = Math.max(0, ...workflow.nodes.map((node) => node.gridX));
  const width = config.paddingLeft + maxGridX * config.gridXSize + config.nodeWidth + config.paddingRight;
  const height = config.paddingTop + Math.max(0, workflow.lanes.length - 1) * config.gridYSize + config.nodeHeight + config.paddingBottom;
  const lastLaneBottom = config.paddingTop + Math.max(0, workflow.lanes.length - 1) * config.gridYSize + config.nodeHeight;
  const lastRenderedBottom = Math.max(
    config.paddingTop + config.nodeHeight,
    lastLaneBottom,
    ...workflow.nodes.map((node) => config.paddingTop + node.gridY * config.gridYSize + config.nodeHeight),
  );
  const timeLineEndY = Math.min(
    height - config.paddingBottom / 2,
    lastRenderedBottom + Math.max(16, config.paddingBottom / 4),
  );
  const nodePosition = (node) => ({
    x: config.paddingLeft + node.gridX * config.gridXSize,
    y: config.paddingTop + node.gridY * config.gridYSize,
  });

  const laneRows = workflow.lanes.map((lane, index) => {
    const y = config.paddingTop + index * config.gridYSize + config.nodeHeight / 2;
    return `
      <text class="lane-label" x="24" y="${y + 5}">${escapeXml(lane.label)}</text>
      <line class="lane-line" x1="${config.paddingLeft - 18}" y1="${y}" x2="${width - config.paddingRight / 2}" y2="${y}" />`;
  });

  const gridLines = Array.from({ length: maxGridX + 1 }, (_, gridX) => {
    const x = config.paddingLeft + gridX * config.gridXSize + config.nodeWidth / 2;
    return `
      <line class="time-line" x1="${x}" y1="${config.paddingTop - 36}" x2="${x}" y2="${timeLineEndY}" />
      <text class="time-label" x="${x}" y="${config.paddingTop - 48}">T${gridX}</text>`;
  });

  const edgeLaneGroupCounts = new Map();
  const edges = [];
  workflow.edges.forEach((edge) => {
    const edgeDefinition = EDGE_DEFINITIONS_BY_TYPE.get(edge.type);
    if (edgeDefinition.visible === false) return;

    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    const fromPos = nodePosition(from);
    const toPos = nodePosition(to);
    const x1 = fromPos.x + config.nodeWidth;
    const y1 = fromPos.y + config.nodeHeight / 2;
    const x2 = toPos.x;
    const y2 = toPos.y + config.nodeHeight / 2;
    const sameLane = from.laneId === to.laneId;
    const forward = to.gridX > from.gridX;
    const laneGroupKey = `${from.gridY}:${to.gridY}`;
    const laneGroupIndex = edgeLaneGroupCounts.get(laneGroupKey) ?? 0;
    edgeLaneGroupCounts.set(laneGroupKey, laneGroupIndex + 1);
    const visibleEdgeIndex = edges.length;
    const pathData = sameLane && forward
      ? straightPathData(x1, y1, x2, y2)
      : connectorPathData(x1, y1, x2, y2, laneGroupIndex, visibleEdgeIndex);

    const classes = ["edge"];
    if (edgeDefinition.dotted) classes.push("edge-dotted");
    const markerEnd = edgeDefinition.marker === "arrow" ? ' marker-end="url(#arrow)"' : "";
    const edgePath = `<path class="${classes.join(" ")}" d="${pathData.path}"${markerEnd} />`;
    edges.push(edgeDefinition.marker === "cross" ? `${edgePath}\n      ${crossMark(pathData)}` : edgePath);
  });

  const nodes = workflow.nodes.map((node) => {
    const { x, y } = nodePosition(node);
    return `
      <g class="node" transform="translate(${x}, ${y})">
        <rect width="${config.nodeWidth}" height="${config.nodeHeight}" rx="8" />
        <text x="${config.nodeWidth / 2}" y="${config.nodeHeight / 2 + 5}">${escapeXml(node.label)}</text>
      </g>`;
  });

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="workflow-title">
  <title id="workflow-title">${escapeXml(workflow.title)}</title>
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M 0 0 L 8 3 L 0 6 z" fill="${theme.edge}" />
    </marker>
    <style>
      svg { background: ${theme.background}; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      .lane-line { stroke: ${theme.laneLine}; stroke-width: 1; }
      .lane-label { fill: ${theme.laneLabel}; font-size: 14px; font-weight: 700; }
      .time-line { stroke: ${theme.timeLine}; stroke-width: 1; stroke-dasharray: 4 8; }
      .time-label { fill: ${theme.timeLabel}; font-size: 12px; font-weight: 700; text-anchor: middle; }
      .edge { fill: none; stroke: ${theme.edge}; stroke-width: 2.4; }
      .edge-dotted { stroke-dasharray: 7 7; }
      .edge-cross-mark line { stroke: ${theme.edge}; stroke-width: 3.4; stroke-linecap: round; }
      .node rect { fill: ${theme.nodeFill}; stroke: ${theme.nodeStroke}; stroke-width: 2; }
      .node text { fill: ${theme.nodeText}; font-size: 14px; font-weight: 700; text-anchor: middle; pointer-events: none; }
    </style>
  </defs>
  <text x="24" y="38" fill="${theme.title}" font-size="22" font-weight="800">${escapeXml(workflow.title)}</text>
  ${gridLines.join("")}
  ${laneRows.join("")}
  ${edges.join("")}
  ${nodes.join("")}
</svg>`.trim();
}

export function generateWorkflowSvg(input, options) {
  const workflow = layoutWorkflow(parseWorkflow(input));
  return renderWorkflowSvg(workflow, options);
}

function parseEdgeChain(line, lineNo) {
  const tokens = line.split(EDGE_TOKEN_PATTERN).map((token) => token.trim()).filter(Boolean);
  if (tokens.length < 3 || tokens.length % 2 === 0) {
    throw new WorkflowError(`依存関係は \`${EDGE_USAGE}\` の形式で記述してください。`, lineNo);
  }

  const edges = [];
  for (let index = 0; index < tokens.length - 2; index += 2) {
    const from = tokens[index];
    const token = tokens[index + 1];
    const to = tokens[index + 2];
    if (!isNodeId(from) || !isNodeId(to)) {
      throw new WorkflowError("矢印の両端にはノードIDを指定してください。", lineNo);
    }
    edges.push({ from, to, type: EDGE_DEFINITIONS_BY_TOKEN.get(token).type });
  }
  return edges;
}

function validateWorkflow({ lanes, nodes, edges, seenSections }) {
  if (!seenSections.has("lanes")) throw new WorkflowError("`## lanes` セクションを定義してください。");
  if (!seenSections.has("nodes")) throw new WorkflowError("`## nodes` セクションを定義してください。");
  if (!seenSections.has("workflow")) throw new WorkflowError("`## workflow` セクションを定義してください。");
  if (lanes.length === 0) throw new WorkflowError("少なくとも1つのレーンを定義してください。");
  const laneSet = new Set(lanes.map((lane) => lane.id));

  for (const node of nodes.values()) {
    if (!laneSet.has(node.laneId)) {
      throw new WorkflowError(`ノード "${node.id}" のレーン "${node.laneId}" が定義されていません。`);
    }
  }

  for (const edge of edges) {
    if (!nodes.has(edge.from)) throw new WorkflowError(`エッジの開始ノード "${edge.from}" が定義されていません。`);
    if (!nodes.has(edge.to)) throw new WorkflowError(`エッジの終了ノード "${edge.to}" が定義されていません。`);
  }
}

function straightPathData(x1, y1, x2, y2) {
  return {
    path: `M ${x1} ${y1} L ${x2} ${y2}`,
    endX: x2,
    endY: y2,
    previousX: x1,
    previousY: y1,
  };
}

function connectorPathData(x1, y1, x2, y2, laneGroupIndex, edgeIndex) {
  const direction = x2 >= x1 ? 1 : -1;
  const spread = 44 + (laneGroupIndex % 6) * 14 + Math.floor(laneGroupIndex / 6) * 8 + (edgeIndex % 2) * 4;
  const c1x = x1 + direction * spread;
  const c2x = x2 - direction * spread;
  return {
    path: `M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}`,
    endX: x2,
    endY: y2,
    previousX: c2x,
    previousY: y2,
  };
}

function crossMark({ endX, endY, previousX, previousY }) {
  const size = 18;
  const halfSize = size / 2;
  const deltaX = endX - previousX;
  const deltaY = endY - previousY;
  const length = Math.hypot(deltaX, deltaY) || 1;
  const unitX = deltaX / length;
  const unitY = deltaY / length;
  const x = endX - unitX * size;
  const y = endY - unitY * size;
  return `<g class="edge-cross-mark" transform="translate(${x}, ${y}) rotate(45)">
        <line x1="${-halfSize}" y1="0" x2="${halfSize}" y2="0" />
        <line x1="0" y1="${-halfSize}" x2="0" y2="${halfSize}" />
      </g>`;
}

function stripComment(line) {
  const index = line.indexOf("%%");
  return index === -1 ? line : line.slice(0, index);
}

function isNodeId(value) {
  return /^[A-Za-z0-9_-]+$/.test(value);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
