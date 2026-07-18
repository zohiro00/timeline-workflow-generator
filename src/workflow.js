import { workflowNodeHighlight } from "./workflow-highlight.js";

const EDGE_DEFINITIONS = [
  { token: "->", type: "solid", marker: "arrow" },
  { token: "-.->", type: "dotted", marker: "arrow", dotted: true },
  { token: "-.-", type: "dottedLine", dotted: true },
  { token: "-x-", type: "cross", marker: "cross" },
  { token: ".x.", type: "dottedCross", marker: "cross", dotted: true },
  { token: "~>", type: "invisible", visible: false },
];
const EDGE_TOKEN_PATTERN = new RegExp(`(${EDGE_DEFINITIONS.map((edge) => escapeRegExp(edge.token)).join("|")})`, "g");
const EDGE_DEFINITIONS_BY_TOKEN = new Map(EDGE_DEFINITIONS.map((edge) => [edge.token, edge]));
const EDGE_DEFINITIONS_BY_TYPE = new Map(EDGE_DEFINITIONS.map((edge) => [edge.type, edge]));
const EDGE_USAGE = EDGE_DEFINITIONS.map((edge) => `a ${edge.token} b`).join("`、`");
const WORKFLOW_SECTIONS = new Set(["lanes", "nodes", "workflow"]);
const LABEL_FIT_STRATEGIES = new Set(["wrap-first", "shrink-first"]);
const CROSS_MARK_SIZE = 20;
const CROSS_MARK_BACKGROUND_RADIUS = 13;
const defaultThemeId = "consulting-blue-outline";
export const workflowSvgDefaults = Object.freeze({
  paddingLeft: 140,
  paddingTop: 116,
  paddingRight: 96,
  paddingBottom: 88,
  gridXSize: 188,
  gridYSize: 116,
  nodeWidth: 112,
  nodeHeight: 42,
  showTimeLabels: true,
  labelFitStrategy: "wrap-first",
});
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
  constructor(message, line = null, code = "workflow.unknown", params = {}) {
    super(line == null ? message : `Line ${line}: ${message}`);
    this.name = "WorkflowError";
    this.line = line;
    this.code = code;
    this.params = Object.freeze({ ...params });
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

export function parseWorkflow(input, options = {}) {
  const blocks = extractWorkflowBlocks(input);
  const source = blocks.length > 0 ? blocks[0].source : input.trim();
  const lineOffset = blocks.length > 0 ? blocks[0].startLine : 0;
  const lanes = [];
  const laneSet = new Set();
  const nodes = new Map();
  const edges = [];
  let title = options.defaultTitle ?? "時系列ワークフロー";
  let currentSection = null;
  let currentNodeLaneId = null;
  let highlightedNodeId = null;
  const seenSections = new Set();

  source.split(/\r?\n/).forEach((rawLine, index) => {
    const lineNo = lineOffset + index + 1;
    const withoutComment = stripComment(rawLine);
    const trimmed = withoutComment.trim();
    if (!trimmed) return;

    if (trimmed.startsWith("# ")) {
      const nextTitle = trimmed.slice(2).trim();
      if (!nextTitle) throw workflowError("タイトルが空です。", lineNo, "title.empty");
      title = nextTitle;
      return;
    }

    if (trimmed.startsWith("## ")) {
      const section = trimmed.slice(3).trim().toLowerCase();
      if (!WORKFLOW_SECTIONS.has(section)) {
        throw workflowError("セクションは `## lanes`、`## nodes`、`## workflow` のいずれかで記述してください。", lineNo, "section.invalid");
      }
      currentSection = section;
      currentNodeLaneId = null;
      seenSections.add(section);
      return;
    }

    if (!currentSection) {
      throw workflowError("`## lanes`、`## nodes`、`## workflow` のいずれかのセクション内に記述してください。", lineNo, "section.required-context");
    }

    if (currentSection === "lanes") {
      const match = trimmed.match(/^-\s+([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
      if (!match) throw workflowError("レーンは `- laneId: レーン名` の形式で記述してください。", lineNo, "lane.syntax");
      const [, id, rawLabel] = match;
      const label = rawLabel.trim();
      if (!label) throw workflowError("レーン名が空です。", lineNo, "lane.name-empty");
      if (laneSet.has(id)) throw workflowError(`レーンID "${id}" が重複しています。`, lineNo, "lane.id-duplicate", { id });
      laneSet.add(id);
      lanes.push({ id, label });
      return;
    }

    if (currentSection === "nodes") {
      const nodeMatch = withoutComment.match(/^  -\s+([A-Za-z0-9_-]+)(?:\s+\[([^\]]*)\])?\s*:\s*(.*)$/);
      if (nodeMatch) {
        const [, id, rawAttribute, rawLabel] = nodeMatch;
        const label = rawLabel.trim();
        if (!currentNodeLaneId) throw workflowError("ノードは所属レーンの配下に記述してください。", lineNo, "node.lane-context");
        if (!label) throw workflowError("ノード名が空です。", lineNo, "node.name-empty");
        if (nodes.has(id)) throw workflowError(`ノードID "${id}" が重複しています。`, lineNo, "node.id-duplicate", { id });
        if (rawAttribute !== undefined && rawAttribute !== workflowNodeHighlight.attribute) {
          throw workflowError(
            `ノード属性 "${rawAttribute}" は使用できません。現在使用できる属性は \`${workflowNodeHighlight.attribute}\` です。`,
            lineNo,
            "node.attribute-unsupported",
            { attribute: rawAttribute, supported: workflowNodeHighlight.attribute },
          );
        }
        if (rawAttribute === workflowNodeHighlight.attribute && highlightedNodeId !== null) {
          throw workflowError(
            `\`${workflowNodeHighlight.attribute}\` は1つのワークフローにつき1ノードだけ指定できます。すでにノード "${highlightedNodeId}" が強調されています。`,
            lineNo,
            "node.highlight-duplicate",
            { attribute: workflowNodeHighlight.attribute, id: highlightedNodeId },
          );
        }
        if (rawAttribute === workflowNodeHighlight.attribute) highlightedNodeId = id;
        nodes.set(id, {
          id,
          label,
          laneId: currentNodeLaneId,
          ...(rawAttribute === workflowNodeHighlight.attribute ? { highlighted: true } : {}),
          gridX: 0,
          gridY: 0,
        });
        return;
      }

      const laneMatch = trimmed.match(/^-\s+([A-Za-z0-9_-]+)\s*$/);
      if (laneMatch) {
        const [, laneId] = laneMatch;
        currentNodeLaneId = laneId;
        return;
      }

      throw workflowError("nodes は `- laneId` と、その配下の `  - nodeId: ノード名` の形式で記述してください。", lineNo, "nodes.syntax");
    }

    if (currentSection === "workflow") {
      const match = trimmed.match(/^-\s+(.+)$/);
      if (!match) throw workflowError("workflow は `- a -> b` の形式で記述してください。", lineNo, "workflow.syntax");
      edges.push(...parseEdgeChain(match[1].trim(), lineNo));
      return;
    }

    throw workflowError("解釈できない行です。", lineNo, "line.unrecognized");
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
  const activeNodeIds = new Set(workflow.edges.flatMap((edge) => [edge.from, edge.to]));
  const activeNodes = workflow.nodes.filter((node) => activeNodeIds.has(node.id));
  const nodes = new Map(activeNodes.map((node) => [node.id, { ...node }]));
  const incoming = new Map(activeNodes.map((node) => [node.id, []]));
  const outgoing = new Map(activeNodes.map((node) => [node.id, []]));

  workflow.edges.forEach((edge) => {
    incoming.get(edge.to).push(edge.from);
    outgoing.get(edge.from).push(edge.to);
  });

  const indegree = new Map(Array.from(incoming, ([id, from]) => [id, from.length]));
  const queue = activeNodes.filter((node) => indegree.get(node.id) === 0).map((node) => node.id);
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

  if (ordered.length !== activeNodes.length) {
    throw workflowError("依存関係に循環があります。DAGになるように矢印を見直してください。", null, "graph.cycle");
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

export function createWorkflowRenderModel(workflow, options = {}) {
  const config = {
    ...workflowSvgDefaults,
    ...options,
  };
  const labelFitStrategy = normalizeLabelFitStrategy(config.labelFitStrategy);
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
    const label = formatSvgLabelLines(lane.label, {
      maxWidth: Math.max(32, config.paddingLeft - 48),
      maxHeight: Math.max(18, config.nodeHeight),
      fontSize: 14,
      minFontSize: 10,
      maxLines: 2,
      strategy: labelFitStrategy,
    });
    return {
      ...lane,
      label,
      labelX: 24,
      y,
      line: {
        x1: config.paddingLeft - 18,
        y1: y,
        x2: width - config.paddingRight / 2,
        y2: y,
      },
    };
  });

  const gridLines = Array.from({ length: maxGridX + 1 }, (_, gridX) => {
    const x = config.paddingLeft + gridX * config.gridXSize + config.nodeWidth / 2;
    return {
      gridX,
      x,
      y1: config.paddingTop - 36,
      y2: timeLineEndY,
      timeLabel: config.showTimeLabels
        ? (config.formatTimeLabel?.(gridX + 1) ?? `Step ${gridX + 1}`)
        : "",
      timeLabelY: config.paddingTop - 48,
    };
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
    edges.push({
      ...edge,
      classes,
      dotted: Boolean(edgeDefinition.dotted),
      marker: edgeDefinition.marker ?? "",
      fromNode: from,
      toNode: to,
      x1,
      y1,
      x2,
      y2,
      sameLane,
      forward,
      pathData,
      connectorPreset: sameLane && forward ? "straightConnector1" : "bentConnector3",
      startConnectionIndex: 3,
      endConnectionIndex: 1,
    });
  });

  const nodes = workflow.nodes.map((node) => {
    const { x, y } = nodePosition(node);
    const label = formatSvgLabelLines(node.label, {
      maxWidth: Math.max(24, config.nodeWidth - 16),
      maxHeight: Math.max(12, config.nodeHeight - 8),
      fontSize: 14,
      minFontSize: 10,
      maxLines: 3,
      strategy: labelFitStrategy,
    });
    return {
      ...node,
      x,
      y,
      width: config.nodeWidth,
      height: config.nodeHeight,
      label,
    };
  });

  return {
    config,
    theme,
    width,
    height,
    title: {
      text: workflow.title,
      x: 24,
      y: 38,
      fontSize: 22,
    },
    gridLines,
    laneRows,
    edges,
    nodes,
  };
}

export function renderWorkflowSvg(workflow, options = {}) {
  const config = {
    ...workflowSvgDefaults,
    ...options,
  };
  const labelFitStrategy = normalizeLabelFitStrategy(config.labelFitStrategy);
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
    const label = formatSvgLabelLines(lane.label, {
      maxWidth: Math.max(32, config.paddingLeft - 48),
      maxHeight: Math.max(18, config.nodeHeight),
      fontSize: 14,
      minFontSize: 10,
      maxLines: 2,
      strategy: labelFitStrategy,
    });
    return `
      <text class="lane-label" x="24" y="${y}" font-size="${label.fontSize}">${renderLabelTspans(label, 24)}</text>
      <line class="lane-line" x1="${config.paddingLeft - 18}" y1="${y}" x2="${width - config.paddingRight / 2}" y2="${y}" />`;
  });

  const gridLines = Array.from({ length: maxGridX + 1 }, (_, gridX) => {
    const x = config.paddingLeft + gridX * config.gridXSize + config.nodeWidth / 2;
    const timeLabel = config.showTimeLabels
      ? `
      <text class="time-label" x="${x}" y="${config.paddingTop - 48}">${escapeXml(config.formatTimeLabel?.(gridX + 1) ?? `Step ${gridX + 1}`)}</text>`
      : "";
    return `
      <line class="time-line" x1="${x}" y1="${config.paddingTop - 36}" x2="${x}" y2="${timeLineEndY}" />${timeLabel}`;
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
    const label = formatSvgLabelLines(node.label, {
      maxWidth: Math.max(24, config.nodeWidth - 16),
      maxHeight: Math.max(12, config.nodeHeight - 8),
      fontSize: 14,
      minFontSize: 10,
      maxLines: 3,
      strategy: labelFitStrategy,
    });
    const classes = ["node"];
    if (node.highlighted) classes.push(workflowNodeHighlight.className);
    return `
      <g class="${classes.join(" ")}" transform="translate(${x}, ${y})">
        <rect width="${config.nodeWidth}" height="${config.nodeHeight}" rx="8" />
        <text x="${config.nodeWidth / 2}" y="${config.nodeHeight / 2}" font-size="${label.fontSize}">${renderLabelTspans(label, config.nodeWidth / 2)}</text>
      </g>`;
  });

  return `
<svg class="workflow-diagram" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="workflow-title">
  <title id="workflow-title">${escapeXml(workflow.title)}</title>
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M 0 0 L 8 3 L 0 6 z" fill="${theme.edge}" />
    </marker>
    <style>
      .workflow-diagram { background: ${theme.background}; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      .lane-line { stroke: ${theme.laneLine}; stroke-width: 1; }
      .lane-label { fill: ${theme.laneLabel}; font-weight: 700; }
      .time-line { stroke: ${theme.timeLine}; stroke-width: 1; stroke-dasharray: 4 8; }
      .time-label { fill: ${theme.timeLabel}; font-size: 12px; font-weight: 700; text-anchor: middle; }
      .edge { fill: none; stroke: ${theme.edge}; stroke-width: 2.4; }
      .edge-dotted { stroke-dasharray: 7 7; }
      .edge-cross-mark-background { fill: ${theme.background}; }
      .edge-cross-mark line { stroke: ${theme.edge}; stroke-width: 3.4; stroke-linecap: round; }
      .node rect { fill: ${theme.nodeFill}; stroke: ${theme.nodeStroke}; stroke-width: 2; }
      .node text { fill: ${theme.nodeText}; font-weight: 700; text-anchor: middle; pointer-events: none; }
      .${workflowNodeHighlight.className} rect { fill: ${workflowNodeHighlight.fill}; stroke: ${workflowNodeHighlight.stroke}; stroke-width: ${workflowNodeHighlight.strokeWidth}; }
      .${workflowNodeHighlight.className} text { fill: ${workflowNodeHighlight.text}; }
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
    throw workflowError(`依存関係は \`${EDGE_USAGE}\` の形式で記述してください。`, lineNo, "edge.syntax", { usage: EDGE_USAGE });
  }

  const edges = [];
  for (let index = 0; index < tokens.length - 2; index += 2) {
    const from = tokens[index];
    const token = tokens[index + 1];
    const to = tokens[index + 2];
    if (!isNodeId(from) || !isNodeId(to)) {
      throw workflowError("矢印の両端にはノードIDを指定してください。", lineNo, "edge.endpoint-invalid");
    }
    edges.push({ from, to, type: EDGE_DEFINITIONS_BY_TOKEN.get(token).type });
  }
  return edges;
}

function validateWorkflow({ lanes, nodes, edges, seenSections }) {
  if (!seenSections.has("lanes")) throw workflowError("`## lanes` セクションを定義してください。", null, "section.lanes-missing");
  if (!seenSections.has("nodes")) throw workflowError("`## nodes` セクションを定義してください。", null, "section.nodes-missing");
  if (!seenSections.has("workflow")) throw workflowError("`## workflow` セクションを定義してください。", null, "section.workflow-missing");
  if (lanes.length === 0) throw workflowError("少なくとも1つのレーンを定義してください。", null, "lane.none");
  const laneSet = new Set(lanes.map((lane) => lane.id));

  for (const node of nodes.values()) {
    if (!laneSet.has(node.laneId)) {
      throw workflowError(`ノード "${node.id}" のレーン "${node.laneId}" が定義されていません。`, null, "node.lane-undefined", { id: node.id, laneId: node.laneId });
    }
  }

  for (const edge of edges) {
    if (!nodes.has(edge.from)) throw workflowError(`エッジの開始ノード "${edge.from}" が定義されていません。`, null, "edge.from-undefined", { id: edge.from });
    if (!nodes.has(edge.to)) throw workflowError(`エッジの終了ノード "${edge.to}" が定義されていません。`, null, "edge.to-undefined", { id: edge.to });
  }
}

function workflowError(message, line, code, params = {}) {
  return new WorkflowError(message, line, code, params);
}

function straightPathData(x1, y1, x2, y2) {
  return {
    path: `M ${x1} ${y1} L ${x2} ${y2}`,
    crossX: (x1 + x2) / 2,
    crossY: (y1 + y2) / 2,
  };
}

function connectorPathData(x1, y1, x2, y2, laneGroupIndex, edgeIndex) {
  const direction = x2 >= x1 ? 1 : -1;
  const spread = 44 + (laneGroupIndex % 6) * 14 + Math.floor(laneGroupIndex / 6) * 8 + (edgeIndex % 2) * 4;
  const c1x = x1 + direction * spread;
  const c2x = x2 - direction * spread;
  return {
    path: `M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}`,
    crossX: cubicBezierPoint(x1, c1x, c2x, x2, 0.5),
    crossY: cubicBezierPoint(y1, y1, y2, y2, 0.5),
  };
}

function crossMark({ crossX, crossY }) {
  const halfSize = CROSS_MARK_SIZE / 2;
  return `<g class="edge-cross-mark" transform="translate(${crossX}, ${crossY}) rotate(45)">
        <circle class="edge-cross-mark-background" r="${CROSS_MARK_BACKGROUND_RADIUS}" />
        <line x1="${-halfSize}" y1="0" x2="${halfSize}" y2="0" />
        <line x1="0" y1="${-halfSize}" x2="0" y2="${halfSize}" />
      </g>`;
}

function cubicBezierPoint(start, control1, control2, end, t) {
  const inverseT = 1 - t;
  return (inverseT ** 3 * start)
    + (3 * inverseT ** 2 * t * control1)
    + (3 * inverseT * t ** 2 * control2)
    + (t ** 3 * end);
}

function formatSvgLabelLines(label, constraints) {
  const config = {
    fontSize: 14,
    minFontSize: 10,
    lineHeightRatio: 1.18,
    maxLines: Infinity,
    strategy: workflowSvgDefaults.labelFitStrategy,
    ...constraints,
  };
  const segments = String(label).split("<br>");
  const strategy = normalizeLabelFitStrategy(config.strategy);

  if (strategy === "shrink-first") {
    const manualFit = fitUnwrappedSegments(segments, config);
    if (manualFit) return manualFit;
  }

  return fitWrappedSegments(segments, config);
}

function fitUnwrappedSegments(segments, config) {
  for (let fontSize = config.fontSize; fontSize >= config.minFontSize; fontSize -= 1) {
    const lines = segments.map((segment) => segment.trim());
    if (labelLinesFit(lines, fontSize, config)) return labelLayout(lines, fontSize, config);
  }

  return null;
}

function fitWrappedSegments(segments, config) {
  for (let fontSize = config.fontSize; fontSize >= config.minFontSize; fontSize -= 1) {
    const lines = wrapLabelSegments(segments, fontSize, config.maxWidth);
    if (labelLinesFit(lines, fontSize, config)) return labelLayout(lines, fontSize, config);
  }

  return truncateLabelLines(wrapLabelSegments(segments, config.minFontSize, config.maxWidth), config);
}

function labelLinesFit(lines, fontSize, config) {
  const maxLines = maxVisibleLabelLines(fontSize, config);
  return lines.length <= maxLines && lines.every((line) => measureLabelText(line, fontSize) <= config.maxWidth);
}

function labelLayout(lines, fontSize, config) {
  const lineHeight = Math.ceil(fontSize * config.lineHeightRatio);
  const startDy = Math.round((fontSize * 0.35 - ((lines.length - 1) * lineHeight) / 2) * 10) / 10;
  return { lines, fontSize, lineHeight, startDy };
}

function truncateLabelLines(lines, config) {
  const fontSize = config.minFontSize;
  const visibleLines = lines.slice(0, maxVisibleLabelLines(fontSize, config));
  if (visibleLines.length === 0) return labelLayout([""], fontSize, config);

  if (lines.length > visibleLines.length) {
    visibleLines[visibleLines.length - 1] = truncateLabelLine(visibleLines[visibleLines.length - 1], fontSize, config.maxWidth);
  }

  return labelLayout(visibleLines, fontSize, config);
}

function maxVisibleLabelLines(fontSize, config) {
  const lineHeight = Math.ceil(fontSize * config.lineHeightRatio);
  return Math.max(1, Math.min(config.maxLines, Math.floor(config.maxHeight / lineHeight)));
}

function wrapLabelSegments(segments, fontSize, maxWidth) {
  return segments.flatMap((segment) => wrapLabelLine(segment.trim(), fontSize, maxWidth));
}

function wrapLabelLine(line, fontSize, maxWidth) {
  if (!line) return [""];
  const tokens = Array.from(line);
  const lines = [];
  let current = "";

  for (const token of tokens) {
    const next = current + token;
    if (current && measureLabelText(next, fontSize) > maxWidth) {
      lines.push(current);
      current = token.trimStart();
    } else {
      current = next;
    }
  }

  if (current || lines.length === 0) lines.push(current);
  return lines;
}

function truncateLabelLine(line, fontSize, maxWidth) {
  const suffix = "...";
  if (measureLabelText(line, fontSize) <= maxWidth) return line;
  let next = line;
  while (next && measureLabelText(`${next}${suffix}`, fontSize) > maxWidth) {
    next = Array.from(next).slice(0, -1).join("");
  }
  return `${next}${suffix}`;
}

function renderLabelTspans(label, x) {
  return label.lines.map((line, index) => {
    const dy = index === 0 ? label.startDy : label.lineHeight;
    return `<tspan x="${x}" dy="${dy}">${escapeXml(line)}</tspan>`;
  }).join("");
}

function measureLabelText(value, fontSize) {
  return Array.from(String(value)).reduce((width, character) => width + characterWidthRatio(character) * fontSize, 0);
}

function characterWidthRatio(character) {
  if (/\s/.test(character)) return 0.34;
  if (/[\u3040-\u30ff\u3400-\u9fff\uff01-\uff60]/u.test(character)) return 1;
  if (/[A-Z0-9]/.test(character)) return 0.62;
  if (/[a-z]/.test(character)) return 0.56;
  return 0.48;
}

function normalizeLabelFitStrategy(value) {
  return LABEL_FIT_STRATEGIES.has(value) ? value : workflowSvgDefaults.labelFitStrategy;
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
