const EDGE_TOKEN_PATTERN = /(-\.->|->)/g;

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

  source.split(/\r?\n/).forEach((rawLine, index) => {
    const lineNo = lineOffset + index + 1;
    const line = stripComment(rawLine).trim();
    if (!line) return;

    if (line.startsWith("title:")) {
      title = line.slice("title:".length).trim() || title;
      return;
    }

    if (line.startsWith("lane:")) {
      const name = line.slice("lane:".length).trim();
      if (!name) throw new WorkflowError("レーン名が空です。", lineNo);
      if (laneSet.has(name)) throw new WorkflowError(`レーン "${name}" が重複しています。`, lineNo);
      laneSet.add(name);
      lanes.push(name);
      return;
    }

    if (line.startsWith("node ")) {
      const match = line.match(/^node\s+([A-Za-z0-9_-]+)\s*:\s*(.+?)\s*\(\s*lane\s*:\s*(.+?)\s*\)\s*$/);
      if (!match) {
        throw new WorkflowError("ノードは `node id: 表示名 (lane: レーン名)` の形式で記述してください。", lineNo);
      }
      const [, id, label, lane] = match.map((value) => value.trim());
      if (nodes.has(id)) throw new WorkflowError(`ノードID "${id}" が重複しています。`, lineNo);
      nodes.set(id, { id, label, lane, gridX: 0, gridY: 0 });
      return;
    }

    if (line.includes("->")) {
      edges.push(...parseEdgeChain(line, lineNo));
      return;
    }

    throw new WorkflowError("解釈できない行です。", lineNo);
  });

  validateWorkflow({ lanes, nodes, edges });

  return {
    title,
    lanes,
    nodes: Array.from(nodes.values()),
    edges,
  };
}

export function layoutWorkflow(workflow) {
  const laneIndex = new Map(workflow.lanes.map((lane, index) => [lane, index]));
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
    node.gridY = laneIndex.get(node.lane);
  }

  return {
    ...workflow,
    nodes: Array.from(nodes.values()),
  };
}

export function renderWorkflowSvg(workflow, options = {}) {
  const config = {
    paddingLeft: 140,
    paddingTop: 92,
    paddingRight: 96,
    paddingBottom: 88,
    gridXSize: 188,
    gridYSize: 116,
    nodeWidth: 112,
    nodeHeight: 42,
    ...options,
  };
  const nodeById = new Map(workflow.nodes.map((node) => [node.id, node]));
  const maxGridX = Math.max(0, ...workflow.nodes.map((node) => node.gridX));
  const width = config.paddingLeft + maxGridX * config.gridXSize + config.nodeWidth + config.paddingRight;
  const height = config.paddingTop + Math.max(0, workflow.lanes.length - 1) * config.gridYSize + config.nodeHeight + config.paddingBottom;
  const nodePosition = (node) => ({
    x: config.paddingLeft + node.gridX * config.gridXSize,
    y: config.paddingTop + node.gridY * config.gridYSize,
  });

  const laneRows = workflow.lanes.map((lane, index) => {
    const y = config.paddingTop + index * config.gridYSize + config.nodeHeight / 2;
    return `
      <text class="lane-label" x="24" y="${y + 5}">${escapeXml(lane)}</text>
      <line class="lane-line" x1="${config.paddingLeft - 18}" y1="${y}" x2="${width - config.paddingRight / 2}" y2="${y}" />`;
  });

  const gridLines = Array.from({ length: maxGridX + 1 }, (_, gridX) => {
    const x = config.paddingLeft + gridX * config.gridXSize + config.nodeWidth / 2;
    return `
      <line class="time-line" x1="${x}" y1="${config.paddingTop - 36}" x2="${x}" y2="${height - config.paddingBottom / 2}" />
      <text class="time-label" x="${x}" y="${config.paddingTop - 48}">T${gridX}</text>`;
  });

  const edges = workflow.edges.map((edge, index) => {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    const fromPos = nodePosition(from);
    const toPos = nodePosition(to);
    const x1 = fromPos.x + config.nodeWidth;
    const y1 = fromPos.y + config.nodeHeight / 2;
    const x2 = toPos.x;
    const y2 = toPos.y + config.nodeHeight / 2;
    const sameLane = from.lane === to.lane;
    const forward = to.gridX > from.gridX;
    const path = sameLane && forward
      ? `M ${x1} ${y1} L ${x2} ${y2}`
      : connectorPath(x1, y1, x2, y2, index);

    return `<path class="edge ${edge.type === "dotted" ? "edge-dotted" : ""}" d="${path}" marker-end="url(#arrow)" />`;
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
      <path d="M 0 0 L 8 3 L 0 6 z" fill="#315f72" />
    </marker>
    <style>
      svg { background: #fbfaf6; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      .lane-line { stroke: #d9d2c1; stroke-width: 1; }
      .lane-label { fill: #5b5f63; font-size: 14px; font-weight: 700; }
      .time-line { stroke: #d7e2dc; stroke-width: 1; stroke-dasharray: 4 8; }
      .time-label { fill: #6a7d74; font-size: 12px; font-weight: 700; text-anchor: middle; }
      .edge { fill: none; stroke: #315f72; stroke-width: 2.4; }
      .edge-dotted { stroke-dasharray: 7 7; }
      .node rect { fill: #ffffff; stroke: #315f72; stroke-width: 2; }
      .node text { fill: #1f2a2e; font-size: 14px; font-weight: 700; text-anchor: middle; pointer-events: none; }
    </style>
  </defs>
  <text x="24" y="38" fill="#1f2a2e" font-size="22" font-weight="800">${escapeXml(workflow.title)}</text>
  ${gridLines.join("")}
  ${laneRows.join("")}
  ${edges.join("")}
  ${nodes.join("")}
</svg>`.trim();
}

export function generateWorkflowSvg(input, options) {
  return renderWorkflowSvg(layoutWorkflow(parseWorkflow(input)), options);
}

function parseEdgeChain(line, lineNo) {
  const tokens = line.split(EDGE_TOKEN_PATTERN).map((token) => token.trim()).filter(Boolean);
  if (tokens.length < 3 || tokens.length % 2 === 0) {
    throw new WorkflowError("依存関係は `a -> b` または `a -.-> b` の形式で記述してください。", lineNo);
  }

  const edges = [];
  for (let index = 0; index < tokens.length - 2; index += 2) {
    const from = tokens[index];
    const token = tokens[index + 1];
    const to = tokens[index + 2];
    if (!isNodeId(from) || !isNodeId(to)) {
      throw new WorkflowError("矢印の両端にはノードIDを指定してください。", lineNo);
    }
    edges.push({ from, to, type: token === "-.->" ? "dotted" : "solid" });
  }
  return edges;
}

function validateWorkflow({ lanes, nodes, edges }) {
  if (lanes.length === 0) throw new WorkflowError("少なくとも1つの lane を定義してください。");
  const laneSet = new Set(lanes);

  for (const node of nodes.values()) {
    if (!laneSet.has(node.lane)) {
      throw new WorkflowError(`ノード "${node.id}" のレーン "${node.lane}" が定義されていません。`);
    }
  }

  for (const edge of edges) {
    if (!nodes.has(edge.from)) throw new WorkflowError(`エッジの開始ノード "${edge.from}" が定義されていません。`);
    if (!nodes.has(edge.to)) throw new WorkflowError(`エッジの終了ノード "${edge.to}" が定義されていません。`);
  }
}

function connectorPath(x1, y1, x2, y2, index) {
  const direction = x2 >= x1 ? 1 : -1;
  const spread = 44 + (index % 4) * 12;
  const c1x = x1 + direction * spread;
  const c2x = x2 - direction * spread;
  return `M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}`;
}

function stripComment(line) {
  const index = line.indexOf("#");
  return index === -1 ? line : line.slice(0, index);
}

function isNodeId(value) {
  return /^[A-Za-z0-9_-]+$/.test(value);
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
