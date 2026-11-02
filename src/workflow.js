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
export const workflowEdgeSyntax = Object.freeze(EDGE_DEFINITIONS.map(({ token, type }) => Object.freeze({ token, type })));
const WORKFLOW_SECTIONS = new Set(["lanes", "nodes", "workflow"]);
const WORKFLOW_SUBSECTIONS = new Set(["annotations"]);
const LABEL_FIT_STRATEGIES = new Set(["wrap-first", "shrink-first"]);
const CROSS_MARK_SIZE = 20;
const CROSS_MARK_BACKGROUND_RADIUS = 13;
const ANNOTATION_TRACK_OFFSET = 32;
const ANNOTATION_TRACK_GAP = 28;
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
  const annotations = [];
  let title = options.defaultTitle ?? "時系列ワークフロー";
  let currentSection = null;
  let currentWorkflowSubsection = null;
  let currentNodeLaneGroup = null;
  let highlightedNodeId = null;
  const seenSections = new Set();
  const nodeLaneGroups = [];

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

    if (trimmed.startsWith("### ")) {
      const subsection = trimmed.slice(4).trim().toLowerCase();
      if (currentSection !== "workflow") {
        throw workflowError("`### annotations` は `## workflow` の中に記述してください。", lineNo, "subsection.context");
      }
      if (!WORKFLOW_SUBSECTIONS.has(subsection)) {
        throw workflowError("workflow の小見出しは `### annotations` と記述してください。", lineNo, "subsection.invalid");
      }
      currentWorkflowSubsection = subsection;
      return;
    }

    if (trimmed.startsWith("## ")) {
      const section = trimmed.slice(3).trim().toLowerCase();
      if (!WORKFLOW_SECTIONS.has(section)) {
        throw workflowError("セクションは `## lanes`、`## nodes`、`## workflow` のいずれかで記述してください。", lineNo, "section.invalid");
      }
      currentSection = section;
      currentWorkflowSubsection = null;
      currentNodeLaneGroup = null;
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
        if (!currentNodeLaneGroup) throw workflowError("ノードは所属レーンの配下に記述してください。", lineNo, "node.lane-context");
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
          laneIds: [...currentNodeLaneGroup.laneIds],
          ...(rawAttribute === workflowNodeHighlight.attribute ? { highlighted: true } : {}),
          gridX: 0,
          gridYStart: 0,
          gridYEnd: 0,
        });
        return;
      }

      const laneGroupMatch = trimmed.match(/^-\s+(.+)$/);
      if (laneGroupMatch) {
        const rawLaneIds = laneGroupMatch[1].split("+").map((laneId) => laneId.trim());
        if (rawLaneIds.some((laneId) => !isNodeId(laneId))) {
          throw workflowError(
            "共有ノードのレーンは `- lane-a + lane-b` の形式で記述してください。",
            lineNo,
            "node.lane-group-syntax",
          );
        }
        currentNodeLaneGroup = { laneIds: rawLaneIds, line: lineNo };
        nodeLaneGroups.push(currentNodeLaneGroup);
        return;
      }

      throw workflowError("nodes は `- laneId` と、その配下の `  - nodeId: ノード名` の形式で記述してください。", lineNo, "nodes.syntax");
    }

    if (currentSection === "workflow") {
      const match = trimmed.match(/^-\s+(.+)$/);
      if (!match) {
        const message = currentWorkflowSubsection === "annotations"
          ? "annotations は `- a <- b` の形式で記述してください。"
          : "workflow は `- a -> b` の形式で記述してください。";
        const code = currentWorkflowSubsection === "annotations" ? "annotation.syntax" : "workflow.syntax";
        throw workflowError(message, lineNo, code);
      }
      if (currentWorkflowSubsection === "annotations") {
        annotations.push(...parseAnnotationChain(match[1].trim(), lineNo));
      } else {
        edges.push(...parseEdgeChain(match[1].trim(), lineNo));
      }
      return;
    }

    throw workflowError("解釈できない行です。", lineNo, "line.unrecognized");
  });

  validateWorkflow({ lanes, nodes, edges, annotations, seenSections, nodeLaneGroups });

  return {
    title,
    lanes,
    nodes: Array.from(nodes.values()),
    edges,
    ...(annotations.length > 0 ? { annotations } : {}),
  };
}

export function layoutWorkflow(workflow) {
  const laneIndex = new Map(workflow.lanes.map((lane, index) => [lane.id, index]));
  const activeNodeIds = new Set(workflow.edges.flatMap((edge) => [edge.from, edge.to]));
  for (const annotation of workflow.annotations ?? []) {
    if (!activeNodeIds.has(annotation.from)) {
      throw workflowError(
        `補助線の開始ノード "${annotation.from}" は workflow の依存関係から参照してください。`,
        null,
        "annotation.from-inactive",
        { id: annotation.from },
      );
    }
    if (!activeNodeIds.has(annotation.to)) {
      throw workflowError(
        `補助線の終了ノード "${annotation.to}" は workflow の依存関係から参照してください。`,
        null,
        "annotation.to-inactive",
        { id: annotation.to },
      );
    }
  }
  const activeNodes = workflow.nodes.filter((node) => activeNodeIds.has(node.id));
  const nodes = new Map(activeNodes.map((node) => [node.id, { ...node, laneIds: [...node.laneIds] }]));
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
    const laneIndexes = node.laneIds.map((laneId) => laneIndex.get(laneId));
    node.gridYStart = Math.min(...laneIndexes);
    node.gridYEnd = Math.max(...laneIndexes);
  }

  for (const annotation of workflow.annotations ?? []) {
    if (nodes.get(annotation.to).gridX >= nodes.get(annotation.from).gridX) {
      throw workflowError(
        `補助線 "${annotation.to} <- ${annotation.from}" は、時系列上で前にあるノードへ戻してください。`,
        null,
        "annotation.not-backward",
        { from: annotation.from, to: annotation.to },
      );
    }
  }

  const laidOutNodes = Array.from(nodes.values());
  const overlap = findSharedNodeOverlap(laidOutNodes);
  if (overlap) {
    throw workflowError(
      `ノード "${overlap.first.id}" と "${overlap.second.id}" は同じ位置で重なります。依存関係を見直してください。`,
      null,
      "node.position-overlap",
      { firstId: overlap.first.id, secondId: overlap.second.id },
    );
  }

  return {
    ...workflow,
    nodes: laidOutNodes,
  };
}

export function createWorkflowRenderModel(workflow, options = {}) {
  const config = {
    ...workflowSvgDefaults,
    ...options,
  };
  const labelFitStrategy = normalizeLabelFitStrategy(config.labelFitStrategy);
  const theme = workflowThemes[config.theme] ?? workflowThemes[defaultThemeId];
  const maxGridX = Math.max(0, ...workflow.nodes.map((node) => node.gridX));
  const width = config.paddingLeft + maxGridX * config.gridXSize + config.nodeWidth + config.paddingRight;
  const baseHeight = config.paddingTop + Math.max(0, workflow.lanes.length - 1) * config.gridYSize + config.nodeHeight + config.paddingBottom;
  const nodes = workflow.nodes.map((node) => {
    const x = config.paddingLeft + node.gridX * config.gridXSize;
    const y = config.paddingTop + node.gridYStart * config.gridYSize;
    const nodeHeight = (node.gridYEnd - node.gridYStart) * config.gridYSize + config.nodeHeight;
    const label = formatSvgLabelLines(node.label, {
      maxWidth: Math.max(24, config.nodeWidth - 16),
      maxHeight: Math.max(12, nodeHeight - 8),
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
      height: nodeHeight,
      centerY: y + nodeHeight / 2,
      label,
    };
  });
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const lastLaneBottom = config.paddingTop + Math.max(0, workflow.lanes.length - 1) * config.gridYSize + config.nodeHeight;
  const lastRenderedBottom = Math.max(
    config.paddingTop + config.nodeHeight,
    lastLaneBottom,
    ...nodes.map((node) => node.y + node.height),
  );
  const annotationCorridorOffset = Math.max(16, Math.min(48, (config.gridXSize - config.nodeWidth) / 2));
  const annotations = (workflow.annotations ?? []).map((annotation, index) => {
    const from = nodeById.get(annotation.from);
    const to = nodeById.get(annotation.to);
    const x1 = from.x + from.width;
    const y1 = from.centerY;
    const x2 = to.x;
    const y2 = to.centerY;
    const startCorridorX = x1 + annotationCorridorOffset;
    const endCorridorX = x2 - annotationCorridorOffset;
    const trackY = lastRenderedBottom + ANNOTATION_TRACK_OFFSET + index * ANNOTATION_TRACK_GAP;
    return {
      ...annotation,
      fromNode: from,
      toNode: to,
      x1,
      y1,
      x2,
      y2,
      startCorridorX,
      endCorridorX,
      trackY,
      pathData: {
        path: `M ${x1} ${y1} L ${startCorridorX} ${y1} L ${startCorridorX} ${trackY} L ${endCorridorX} ${trackY} L ${endCorridorX} ${y2} L ${x2} ${y2}`,
      },
      startConnectionIndex: 3,
      endConnectionIndex: 1,
    };
  });
  const height = annotations.length === 0
    ? baseHeight
    : Math.max(baseHeight, annotations.at(-1).trackY + config.paddingBottom / 2);
  const timeLineEndY = Math.min(
    baseHeight - config.paddingBottom / 2,
    lastRenderedBottom + Math.max(16, config.paddingBottom / 4),
  );
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
    const x1 = from.x + from.width;
    const y1 = from.centerY;
    const x2 = to.x;
    const y2 = to.centerY;
    const sameLane = y1 === y2;
    const forward = to.gridX > from.gridX;
    const laneGroupKey = `${y1}:${y2}`;
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
    ...(annotations.length > 0 ? { annotations } : {}),
    nodes,
  };
}

export function renderWorkflowSvg(workflow, options = {}) {
  const model = createWorkflowRenderModel(workflow, options);
  const { config, theme, width, height } = model;

  const laneRows = model.laneRows.map((lane) => {
    return `
      <text class="lane-label" x="${lane.labelX}" y="${lane.y}" font-size="${lane.label.fontSize}">${renderLabelTspans(lane.label, lane.labelX)}</text>
      <line class="lane-line" x1="${lane.line.x1}" y1="${lane.line.y1}" x2="${lane.line.x2}" y2="${lane.line.y2}" />`;
  });

  const gridLines = model.gridLines.map((line) => {
    const timeLabel = line.timeLabel
      ? `
      <text class="time-label" x="${line.x}" y="${line.timeLabelY}">${escapeXml(line.timeLabel)}</text>`
      : "";
    return `
      <line class="time-line" x1="${line.x}" y1="${line.y1}" x2="${line.x}" y2="${line.y2}" />${timeLabel}`;
  });

  const edges = model.edges.map((edge) => {
    const markerEnd = edge.marker === "arrow" ? ' marker-end="url(#arrow)"' : "";
    const edgePath = `<path class="${edge.classes.join(" ")}" d="${edge.pathData.path}"${markerEnd} />`;
    return edge.marker === "cross" ? `${edgePath}\n      ${crossMark(edge.pathData)}` : edgePath;
  });

  const annotations = (model.annotations ?? []).map((annotation) => {
    return `<path class="annotation annotation-return" d="${annotation.pathData.path}" marker-end="url(#annotation-arrow)" />`;
  });
  const annotationMarker = annotations.length === 0 ? "" : `
    <marker id="annotation-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M 0 0 L 8 3 L 0 6 z" fill="${theme.edge}" />
    </marker>`;
  const annotationStyle = annotations.length === 0
    ? ""
    : `
      .annotation { fill: none; stroke: ${theme.edge}; stroke-width: 2.4; stroke-dasharray: 7 7; }`;

  const nodes = model.nodes.map((node) => {
    const classes = ["node"];
    if (node.highlighted) classes.push(workflowNodeHighlight.className);
    return `
      <g class="${classes.join(" ")}" transform="translate(${node.x}, ${node.y})">
        <rect width="${node.width}" height="${node.height}" rx="8" />
        <text x="${node.width / 2}" y="${node.height / 2}" font-size="${node.label.fontSize}">${renderLabelTspans(node.label, node.width / 2)}</text>
      </g>`;
  });

  return `
<svg class="workflow-diagram" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="workflow-title">
  <title id="workflow-title">${escapeXml(model.title.text)}</title>
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M 0 0 L 8 3 L 0 6 z" fill="${theme.edge}" />
    </marker>${annotationMarker}
    <style>
      .workflow-diagram { background: ${theme.background}; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      .lane-line { stroke: ${theme.laneLine}; stroke-width: 1; }
      .lane-label { fill: ${theme.laneLabel}; font-weight: 700; }
      .time-line { stroke: ${theme.timeLine}; stroke-width: 1; stroke-dasharray: 4 8; }
      .time-label { fill: ${theme.timeLabel}; font-size: 12px; font-weight: 700; text-anchor: middle; }
      .edge { fill: none; stroke: ${theme.edge}; stroke-width: 2.4; }
      .edge-dotted { stroke-dasharray: 7 7; }${annotationStyle}
      .edge-cross-mark-background { fill: ${theme.background}; }
      .edge-cross-mark line { stroke: ${theme.edge}; stroke-width: 3.4; stroke-linecap: round; }
      .node rect { fill: ${theme.nodeFill}; stroke: ${theme.nodeStroke}; stroke-width: 2; }
      .node text { fill: ${theme.nodeText}; font-weight: 700; text-anchor: middle; pointer-events: none; }
      .${workflowNodeHighlight.className} rect { fill: ${workflowNodeHighlight.fill}; stroke: ${workflowNodeHighlight.stroke}; stroke-width: ${workflowNodeHighlight.strokeWidth}; }
      .${workflowNodeHighlight.className} text { fill: ${workflowNodeHighlight.text}; }
    </style>
  </defs>
  <text x="${model.title.x}" y="${model.title.y}" fill="${theme.title}" font-size="${model.title.fontSize}" font-weight="800">${escapeXml(model.title.text)}</text>
  ${gridLines.join("")}
  ${laneRows.join("")}
  ${edges.join("")}${annotations.length > 0 ? `\n  ${annotations.join("")}` : ""}
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

function parseAnnotationChain(line, lineNo) {
  const nodeIds = line.split("<-").map((nodeId) => nodeId.trim());
  if (nodeIds.length < 2 || nodeIds.some((nodeId) => !isNodeId(nodeId))) {
    throw workflowError("補助線は `a <- b` の形式で記述してください。", lineNo, "annotation.syntax");
  }

  return nodeIds.slice(0, -1).map((to, index) => ({
    from: nodeIds[index + 1],
    to,
    type: "return",
  }));
}

function validateWorkflow({ lanes, nodes, edges, annotations, seenSections, nodeLaneGroups }) {
  if (!seenSections.has("lanes")) throw workflowError("`## lanes` セクションを定義してください。", null, "section.lanes-missing");
  if (!seenSections.has("nodes")) throw workflowError("`## nodes` セクションを定義してください。", null, "section.nodes-missing");
  if (!seenSections.has("workflow")) throw workflowError("`## workflow` セクションを定義してください。", null, "section.workflow-missing");
  if (lanes.length === 0) throw workflowError("少なくとも1つのレーンを定義してください。", null, "lane.none");
  const laneIndex = new Map(lanes.map((lane, index) => [lane.id, index]));

  for (const group of nodeLaneGroups) {
    const duplicateLaneId = group.laneIds.find((laneId, index) => group.laneIds.indexOf(laneId) !== index);
    if (duplicateLaneId) {
      throw workflowError(
        `共有ノードのレーン "${duplicateLaneId}" が重複しています。`,
        group.line,
        "node.lane-duplicate",
        { laneId: duplicateLaneId },
      );
    }
    const undefinedLaneId = group.laneIds.find((laneId) => !laneIndex.has(laneId));
    if (undefinedLaneId) {
      throw workflowError(
        `ノードの所属レーン "${undefinedLaneId}" が定義されていません。`,
        group.line,
        "node.lane-undefined",
        { laneId: undefinedLaneId },
      );
    }
    const indexes = group.laneIds.map((laneId) => laneIndex.get(laneId)).sort((a, b) => a - b);
    if (indexes.length > 1 && indexes.at(-1) - indexes[0] + 1 !== indexes.length) {
      throw workflowError(
        `共有ノードの対象レーン "${group.laneIds.join(", ")}" は連続していません。`,
        group.line,
        "node.lanes-not-contiguous",
        { laneIds: group.laneIds.join(", ") },
      );
    }
  }

  for (const node of nodes.values()) {
    node.laneIds.sort((first, second) => laneIndex.get(first) - laneIndex.get(second));
  }

  for (const edge of edges) {
    if (!nodes.has(edge.from)) throw workflowError(`エッジの開始ノード "${edge.from}" が定義されていません。`, null, "edge.from-undefined", { id: edge.from });
    if (!nodes.has(edge.to)) throw workflowError(`エッジの終了ノード "${edge.to}" が定義されていません。`, null, "edge.to-undefined", { id: edge.to });
  }

  for (const annotation of annotations) {
    if (!nodes.has(annotation.from)) {
      throw workflowError(
        `補助線の開始ノード "${annotation.from}" が定義されていません。`,
        null,
        "annotation.from-undefined",
        { id: annotation.from },
      );
    }
    if (!nodes.has(annotation.to)) {
      throw workflowError(
        `補助線の終了ノード "${annotation.to}" が定義されていません。`,
        null,
        "annotation.to-undefined",
        { id: annotation.to },
      );
    }
  }
}

function findSharedNodeOverlap(nodes) {
  for (let firstIndex = 0; firstIndex < nodes.length; firstIndex += 1) {
    const first = nodes[firstIndex];
    for (let secondIndex = firstIndex + 1; secondIndex < nodes.length; secondIndex += 1) {
      const second = nodes[secondIndex];
      if (first.laneIds.length === 1 && second.laneIds.length === 1) continue;
      if (first.gridX !== second.gridX) continue;
      if (first.gridYStart > second.gridYEnd || second.gridYStart > first.gridYEnd) continue;
      return { first, second };
    }
  }
  return null;
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
