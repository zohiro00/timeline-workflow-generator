import { createWorkflowRenderModel } from "./workflow.js";
import { workflowNodeHighlight } from "./workflow-highlight.js";
import { blankPptxTemplateFiles } from "./workflow-pptx-template.js";

export const workflowPptxMimeType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

const slideWidthEmu = 12192000;
const slideHeightEmu = 6858000;
const slideMarginEmu = 274320;
const emuPerPoint = 12700;
const fixedZipTime = 0;
const fixedZipDate = 33;

export function createWorkflowPptxBlob(workflow, options = {}) {
  return new Blob([generateWorkflowPptxBytes(workflow, options)], { type: workflowPptxMimeType });
}

export function generateWorkflowPptxBytes(workflow, options = {}) {
  return createStoredZip(createWorkflowPptxFiles(workflow, options));
}

export function createWorkflowPptxFiles(workflow, options = {}) {
  const model = createWorkflowRenderModel(workflow, options);
  return {
    ...blankPptxTemplateFiles,
    "ppt/slides/slide1.xml": createSlideXml(model),
  };
}

function createSlideXml(model) {
  const layout = createSlideLayout(model.width, model.height);
  let nextShapeId = 2;
  const nodeShapeIds = new Map(model.nodes.map((node) => [node.id, nextShapeId++]));
  const shapes = [];

  model.gridLines.forEach((line) => {
    const x = layout.x(line.x);
    shapes.push(lineXml({
      id: nextShapeId++,
      name: `Step ${line.gridX + 1} guide`,
      x1: x,
      y1: layout.y(line.y1),
      x2: x,
      y2: layout.y(line.y2),
      color: model.theme.timeLine,
      width: layout.size(1),
      dash: "dash",
    }));
    if (line.timeLabel) {
      shapes.push(textBoxXml({
        id: nextShapeId++,
        name: `Step ${line.gridX + 1} label`,
        x: x - layout.size(56),
        y: layout.y(line.timeLabelY - 10),
        width: layout.size(112),
        height: layout.size(18),
        textLines: [line.timeLabel],
        fontSize: layout.fontSize(12),
        color: model.theme.timeLabel,
        bold: true,
        align: "ctr",
      }));
    }
  });

  model.laneRows.forEach((lane) => {
    shapes.push(textBoxXml({
      id: nextShapeId++,
      name: `${lane.id} lane label`,
      x: layout.x(lane.labelX),
      y: layout.y(lane.y - model.config.nodeHeight / 2),
      width: layout.size(Math.max(32, model.config.paddingLeft - 48)),
      height: layout.size(model.config.nodeHeight),
      textLines: lane.label.lines,
      fontSize: layout.fontSize(lane.label.fontSize),
      color: model.theme.laneLabel,
      bold: true,
      align: "l",
    }));
    shapes.push(lineXml({
      id: nextShapeId++,
      name: `${lane.id} lane line`,
      x1: layout.x(lane.line.x1),
      y1: layout.y(lane.line.y1),
      x2: layout.x(lane.line.x2),
      y2: layout.y(lane.line.y2),
      color: model.theme.laneLine,
      width: layout.size(1),
    }));
  });

  model.nodes.forEach((node) => {
    const highlightStyle = node.highlighted ? workflowNodeHighlight : null;
    shapes.push(nodeXml({
      id: nodeShapeIds.get(node.id),
      name: node.id,
      x: layout.x(node.x),
      y: layout.y(node.y),
      width: layout.size(node.width),
      height: layout.size(node.height),
      textLines: node.label.lines,
      fontSize: layout.fontSize(node.label.fontSize),
      fill: highlightStyle?.fill ?? model.theme.nodeFill,
      stroke: highlightStyle?.stroke ?? model.theme.nodeStroke,
      strokeWidth: highlightStyle ? layout.size(highlightStyle.strokeWidth) : undefined,
      textColor: highlightStyle?.text ?? model.theme.nodeText,
    }));
  });

  model.edges.forEach((edge) => {
    shapes.push(connectorXml({
      id: nextShapeId++,
      name: `${edge.from} to ${edge.to}`,
      fromShapeId: nodeShapeIds.get(edge.from),
      toShapeId: nodeShapeIds.get(edge.to),
      startConnectionIndex: edge.startConnectionIndex,
      endConnectionIndex: edge.endConnectionIndex,
      preset: edge.connectorPreset,
      x1: layout.x(edge.x1),
      y1: layout.y(edge.y1),
      x2: layout.x(edge.x2),
      y2: layout.y(edge.y2),
      color: model.theme.edge,
      width: layout.size(2.4),
      dash: edge.dotted ? "dash" : "",
      arrow: edge.marker === "arrow",
    }));

    if (edge.marker === "cross") {
      const centerX = layout.x(edge.pathData.crossX);
      const centerY = layout.y(edge.pathData.crossY);
      const halfSize = layout.size(10);
      shapes.push(lineXml({
        id: nextShapeId++,
        name: `${edge.from} to ${edge.to} cross 1`,
        x1: centerX - halfSize,
        y1: centerY - halfSize,
        x2: centerX + halfSize,
        y2: centerY + halfSize,
        color: model.theme.edge,
        width: layout.size(3.4),
      }));
      shapes.push(lineXml({
        id: nextShapeId++,
        name: `${edge.from} to ${edge.to} cross 2`,
        x1: centerX - halfSize,
        y1: centerY + halfSize,
        x2: centerX + halfSize,
        y2: centerY - halfSize,
        color: model.theme.edge,
        width: layout.size(3.4),
      }));
    }
  });

  shapes.push(textBoxXml({
    id: nextShapeId++,
    name: "Workflow title",
    x: layout.x(model.title.x),
    y: layout.y(model.title.y - 28),
    width: layout.size(Math.min(model.width - 48, 700)),
    height: layout.size(34),
    textLines: [model.title.text],
    fontSize: layout.fontSize(model.title.fontSize),
    color: model.theme.title,
    bold: true,
    align: "l",
  }));

  return xmlDocument(`\
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld name="Slide 1">
    <p:spTree>
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>
      ${shapes.join("\n      ")}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`);
}

function createSlideLayout(modelWidth, modelHeight) {
  const scale = Math.min(
    (slideWidthEmu - slideMarginEmu * 2) / modelWidth,
    (slideHeightEmu - slideMarginEmu * 2) / modelHeight,
  );
  const offsetX = Math.round((slideWidthEmu - modelWidth * scale) / 2);
  const offsetY = Math.round((slideHeightEmu - modelHeight * scale) / 2);

  return {
    x: (value) => Math.round(offsetX + value * scale),
    y: (value) => Math.round(offsetY + value * scale),
    size: (value) => Math.max(1, Math.round(value * scale)),
    fontSize: (value) => Math.max(100, Math.round((value * scale / emuPerPoint) * 100)),
  };
}

function nodeXml({ id, name, x, y, width, height, textLines, fontSize, fill, stroke, strokeWidth, textColor }) {
  return `\
<p:sp>
  <p:nvSpPr>
    <p:cNvPr id="${id}" name="${escapeXml(name)}"/>
    <p:cNvSpPr/>
    <p:nvPr/>
  </p:nvSpPr>
  <p:spPr>
    <a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${width}" cy="${height}"/></a:xfrm>
    <a:prstGeom prst="roundRect"><a:avLst/></a:prstGeom>
    ${fillXml(fill)}
    <a:ln w="${strokeWidth ?? Math.max(1, Math.round(width / 56))}">${solidFillXml(stroke)}</a:ln>
  </p:spPr>
  ${textBodyXml(textLines, fontSize, textColor, true, "ctr")}
</p:sp>`;
}

function textBoxXml({ id, name, x, y, width, height, textLines, fontSize, color, bold, align }) {
  return `\
<p:sp>
  <p:nvSpPr>
    <p:cNvPr id="${id}" name="${escapeXml(name)}"/>
    <p:cNvSpPr txBox="1"/>
    <p:nvPr/>
  </p:nvSpPr>
  <p:spPr>
    <a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${width}" cy="${height}"/></a:xfrm>
    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
    <a:noFill/>
    <a:ln><a:noFill/></a:ln>
  </p:spPr>
  ${textBodyXml(textLines, fontSize, color, bold, align)}
</p:sp>`;
}

function connectorXml({
  id,
  name,
  fromShapeId,
  toShapeId,
  startConnectionIndex,
  endConnectionIndex,
  preset,
  x1,
  y1,
  x2,
  y2,
  color,
  width,
  dash,
  arrow,
}) {
  const transform = lineTransform(x1, y1, x2, y2);
  return `\
<p:cxnSp>
  <p:nvCxnSpPr>
    <p:cNvPr id="${id}" name="${escapeXml(name)}"/>
    <p:cNvCxnSpPr>
      <a:stCxn id="${fromShapeId}" idx="${startConnectionIndex}"/>
      <a:endCxn id="${toShapeId}" idx="${endConnectionIndex}"/>
    </p:cNvCxnSpPr>
    <p:nvPr/>
  </p:nvCxnSpPr>
  <p:spPr>
    ${xfrmXml(transform)}
    <a:prstGeom prst="${preset}"><a:avLst/></a:prstGeom>
    ${lineStyleXml(color, width, dash, arrow)}
  </p:spPr>
  <p:style>
    <a:lnRef idx="2"><a:schemeClr val="accent1"/></a:lnRef>
    <a:fillRef idx="0"><a:schemeClr val="accent1"/></a:fillRef>
    <a:effectRef idx="0"><a:schemeClr val="accent1"/></a:effectRef>
    <a:fontRef idx="minor"><a:schemeClr val="tx1"/></a:fontRef>
  </p:style>
</p:cxnSp>`;
}

function lineXml({ id, name, x1, y1, x2, y2, color, width, dash = "" }) {
  const transform = lineTransform(x1, y1, x2, y2);
  return `\
<p:cxnSp>
  <p:nvCxnSpPr>
    <p:cNvPr id="${id}" name="${escapeXml(name)}"/>
    <p:cNvCxnSpPr/>
    <p:nvPr/>
  </p:nvCxnSpPr>
  <p:spPr>
    ${xfrmXml(transform)}
    <a:prstGeom prst="straightConnector1"><a:avLst/></a:prstGeom>
    ${lineStyleXml(color, width, dash, false)}
  </p:spPr>
</p:cxnSp>`;
}

function lineTransform(x1, y1, x2, y2) {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.max(1, Math.abs(x2 - x1)),
    height: Math.max(1, Math.abs(y2 - y1)),
    flipH: x2 < x1,
    flipV: y2 < y1,
  };
}

function xfrmXml({ x, y, width, height, flipH, flipV }) {
  const flips = `${flipH ? ' flipH="1"' : ""}${flipV ? ' flipV="1"' : ""}`;
  return `<a:xfrm${flips}><a:off x="${x}" y="${y}"/><a:ext cx="${width}" cy="${height}"/></a:xfrm>`;
}

function textBodyXml(lines, fontSize, color, bold, align) {
  const paragraphs = lines.map((line) => `\
<a:p>
  <a:pPr algn="${align}"/>
  <a:r>
    <a:rPr lang="ja-JP" sz="${fontSize}"${bold ? ' b="1"' : ""}>
      ${solidFillXml(color)}
      <a:latin typeface="Yu Gothic"/>
      <a:ea typeface="Yu Gothic"/>
    </a:rPr>
    <a:t>${escapeXml(line)}</a:t>
  </a:r>
</a:p>`).join("");

  return `\
<p:txBody>
  <a:bodyPr anchor="ctr" wrap="square"><a:spAutoFit/></a:bodyPr>
  <a:lstStyle/>
  ${paragraphs}
</p:txBody>`;
}

function lineStyleXml(color, width, dash, arrow) {
  return `\
<a:ln w="${Math.max(1, Math.round(width))}" cap="rnd">
  ${solidFillXml(color)}
  ${dash ? `<a:prstDash val="${dash}"/>` : ""}
  ${arrow ? '<a:tailEnd type="triangle"/>' : ""}
</a:ln>`;
}

function fillXml(color) {
  return color === "none" ? "<a:noFill/>" : solidFillXml(color);
}

function solidFillXml(color) {
  return `<a:solidFill><a:srgbClr val="${rgb(color)}"/></a:solidFill>`;
}

function rgb(color) {
  return String(color).replace(/^#/, "").toUpperCase();
}

function xmlDocument(xml) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${xml}`;
}

function createStoredZip(files) {
  const encoder = new TextEncoder();
  const chunks = [];
  const centralDirectory = [];
  let offset = 0;

  Object.entries(files).forEach(([path, content]) => {
    const name = encoder.encode(path);
    const data = typeof content === "string" ? encoder.encode(content) : content;
    const crc = crc32(data);
    const localHeader = new Uint8Array(30 + name.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, fixedZipTime, true);
    localView.setUint16(12, fixedZipDate, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, data.length, true);
    localView.setUint16(26, name.length, true);
    localView.setUint16(28, 0, true);
    localHeader.set(name, 30);

    const centralHeader = new Uint8Array(46 + name.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, fixedZipTime, true);
    centralView.setUint16(14, fixedZipDate, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    centralHeader.set(name, 46);

    chunks.push(localHeader, data);
    centralDirectory.push(centralHeader);
    offset += localHeader.length + data.length;
  });

  const centralOffset = offset;
  const centralSize = centralDirectory.reduce((sum, entry) => sum + entry.length, 0);
  const endHeader = new Uint8Array(22);
  const endView = new DataView(endHeader.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, centralDirectory.length, true);
  endView.setUint16(10, centralDirectory.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, centralOffset, true);
  endView.setUint16(20, 0, true);

  return concatUint8Arrays([...chunks, ...centralDirectory, endHeader]);
}

function concatUint8Arrays(arrays) {
  const totalLength = arrays.reduce((sum, array) => sum + array.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  arrays.forEach((array) => {
    result.set(array, offset);
    offset += array.length;
  });
  return result;
}

const crc32Table = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = crc32Table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
