import assert from "node:assert/strict";
import test from "node:test";
import { createWorkflowPptxFiles, generateWorkflowPptxBytes, workflowPptxMimeType } from "../src/workflow-pptx.js";
import { layoutWorkflow, parseWorkflow } from "../src/workflow.js";

const sample = `# PPTX Connector Test

## lanes
- main: メイン
- sub: サブ

## nodes
- main
  - a: 開始
  - b: 承認
- sub
  - c: 確認

## workflow
- a -> b -.-> c
`;

test("generates a pptx package without raster image parts", () => {
  const workflow = layoutWorkflow(parseWorkflow(sample));
  const files = createWorkflowPptxFiles(workflow);
  const bytes = generateWorkflowPptxBytes(workflow);

  assert.equal(workflowPptxMimeType, "application/vnd.openxmlformats-officedocument.presentationml.presentation");
  assert.ok(bytes instanceof Uint8Array);
  assert.equal(bytes[0], 0x50);
  assert.equal(bytes[1], 0x4b);
  assert.ok(files["[Content_Types].xml"]);
  assert.ok(files["ppt/slides/slide1.xml"]);
  assert.equal(Object.keys(files).some((path) => path.includes("/media/")), false);
  assert.doesNotMatch(files["ppt/slides/slide1.xml"], /<a:blip|<p:pic/);
});

test("writes PowerPoint connector shapes bound to node shape ids", () => {
  const workflow = layoutWorkflow(parseWorkflow(sample));
  const slide = createWorkflowPptxFiles(workflow)["ppt/slides/slide1.xml"];
  const aId = shapeId(slide, "a");
  const bId = shapeId(slide, "b");
  const cId = shapeId(slide, "c");

  assert.match(slide, /<p:cxnSp>/);
  assert.match(slide, /<a:prstGeom prst="straightConnector1"><a:avLst\/><\/a:prstGeom>/);
  assert.match(slide, /<a:prstGeom prst="bentConnector3"><a:avLst\/><\/a:prstGeom>/);
  assert.match(slide, connectionPattern(aId, bId));
  assert.match(slide, connectionPattern(bId, cId));
  assert.match(slide, /<a:tailEnd type="triangle"\/>/);
  assert.match(slide, /<a:prstDash val="dash"\/>/);
});

function shapeId(slideXml, name) {
  const match = slideXml.match(new RegExp(`<p:cNvPr id="(\\d+)" name="${name}"\\/>`));
  assert.ok(match, `expected shape named ${name}`);
  return Number(match[1]);
}

function connectionPattern(fromId, toId) {
  return new RegExp(`<a:stCxn id="${fromId}" idx="3"\\/>\\s*<a:endCxn id="${toId}" idx="1"\\/>`);
}
