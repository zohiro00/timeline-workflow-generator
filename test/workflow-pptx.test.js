import assert from "node:assert/strict";
import test from "node:test";
import { createWorkflowPptxFiles, generateWorkflowPptxBytes, workflowPptxMimeType } from "../src/workflow-pptx.js";
import { blankPptxTemplateFiles } from "../src/workflow-pptx-template.js";
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
const sharedSample = `# Shared PPTX

## lanes
- a: A
- b: B

## nodes
- a
  - a1: A1
- b
  - b1: B1
- a + b
  - ab1 [highlight]: Meet
  - ab2: Arrive

## workflow
- a1 -> ab1 -> ab2
- b1 -> ab1
`;
const annotationSample = `# Return annotation

## lanes
- main: Main

## nodes
- main
  - generate: Generate
  - review: Review
  - delivery: Delivery

## workflow
- generate -> review -> delivery

### annotations
- generate <- review
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

test("uses the blank pptx template package and replaces only the workflow slide", () => {
  const workflow = layoutWorkflow(parseWorkflow(sample));
  const files = createWorkflowPptxFiles(workflow);

  assert.deepEqual(Object.keys(files).sort(), Object.keys(blankPptxTemplateFiles).sort());
  assert.notEqual(files["ppt/slides/slide1.xml"], blankPptxTemplateFiles["ppt/slides/slide1.xml"]);

  Object.keys(blankPptxTemplateFiles).forEach((path) => {
    if (path === "ppt/slides/slide1.xml") return;
    assert.equal(files[path], blankPptxTemplateFiles[path], `${path} should stay identical to the template`);
  });
});

test("writes PowerPoint connector shapes bound to node shape ids", () => {
  const workflow = layoutWorkflow(parseWorkflow(sample));
  const slide = createWorkflowPptxFiles(workflow)["ppt/slides/slide1.xml"];
  const aId = shapeId(slide, "a");
  const bId = shapeId(slide, "b");
  const cId = shapeId(slide, "c");
  const firstNodeIndex = slide.indexOf(`<p:cNvPr id="${aId}" name="a"/>`);

  assert.match(slide, /<p:cxnSp>/);
  assert.match(slide, /<a:prstGeom prst="straightConnector1"><a:avLst\/><\/a:prstGeom>/);
  assert.match(slide, /<a:prstGeom prst="bentConnector3"><a:avLst\/><\/a:prstGeom>/);
  assert.notEqual(firstNodeIndex, -1);
  assert.ok(firstNodeIndex < connectedConnectorIndex(slide), "node shapes should be written before bound connectors");
  assert.match(slide, connectionPattern(aId, bId));
  assert.match(slide, connectionPattern(bId, cId));
  assert.match(slide, /<a:tailEnd type="triangle"\/>/);
  assert.match(slide, /<a:prstDash val="dash"\/>/);
});

test("writes return annotations as editable PowerPoint connector segments", () => {
  const workflow = layoutWorkflow(parseWorkflow(annotationSample));
  const slide = createWorkflowPptxFiles(workflow)["ppt/slides/slide1.xml"];
  const generateId = shapeId(slide, "generate");
  const reviewId = shapeId(slide, "review");

  assert.match(slide, /name="annotation review to generate segment 1"/u);
  assert.match(slide, /name="annotation review to generate segment 2"/u);
  assert.match(slide, /name="annotation review to generate segment 3"/u);
  assert.match(slide, /name="annotation review to generate segment 4"/u);
  assert.match(slide, /name="annotation review to generate segment 5"/u);
  assert.match(slide, new RegExp(`<a:stCxn id="${reviewId}" idx="3"\/>`));
  assert.match(slide, new RegExp(`<a:endCxn id="${generateId}" idx="1"\/>`));
  assert.match(slide, /<a:prstDash val="dash"\/>/u);
  assert.match(slide, /<a:tailEnd type="triangle"\/>/u);
});

test("writes a shared node as one tall editable shape with bound connectors", () => {
  const workflow = layoutWorkflow(parseWorkflow(sharedSample));
  const slide = createWorkflowPptxFiles(workflow)["ppt/slides/slide1.xml"];
  const a1Id = shapeId(slide, "a1");
  const b1Id = shapeId(slide, "b1");
  const ab1Id = shapeId(slide, "ab1");
  const ab2Id = shapeId(slide, "ab2");
  const regularExtent = shapeExtent(shapeXml(slide, "a1"));
  const sharedShape = shapeXml(slide, "ab1");
  const sharedExtent = shapeExtent(sharedShape);

  assert.equal((slide.match(/name="ab1"\/>/g) ?? []).length, 1);
  assert.equal(sharedExtent.width, regularExtent.width);
  assert.ok(sharedExtent.height > regularExtent.height * 3);
  assert.match(sharedShape, /<a:srgbClr val="FCECEC"\/>/);
  assert.match(slide, connectionPattern(a1Id, ab1Id));
  assert.match(slide, connectionPattern(b1Id, ab1Id));
  assert.match(slide, connectionPattern(ab1Id, ab2Id));
});

test("styles only the highlighted PowerPoint node", () => {
  const workflow = layoutWorkflow(parseWorkflow(sample.replace("  - a: 開始", "  - a [highlight]: 開始")));
  const slide = createWorkflowPptxFiles(workflow)["ppt/slides/slide1.xml"];
  const highlightedShape = shapeXml(slide, "a");
  const regularShape = shapeXml(slide, "b");

  assert.match(highlightedShape, /<a:srgbClr val="FCECEC"\/>/);
  assert.match(highlightedShape, /<a:srgbClr val="C65A5A"\/>/);
  assert.match(highlightedShape, /<a:srgbClr val="4A2020"\/>/);
  assert.doesNotMatch(regularShape, /FCECEC|C65A5A|4A2020/);
  assert.match(regularShape, /<a:srgbClr val="1F4E79"\/>/);
  assert.equal(nodeStrokeWidth(highlightedShape), nodeStrokeWidth(regularShape) * 2);
});

test("writes complete theme style lists for PowerPoint repair-free loading", () => {
  const workflow = layoutWorkflow(parseWorkflow(sample));
  const theme = createWorkflowPptxFiles(workflow)["ppt/theme/theme1.xml"];

  assert.equal(countElements(theme, "a:fillStyleLst", "a:solidFill|a:gradFill"), 3);
  assert.equal(countElements(theme, "a:lnStyleLst", "a:ln"), 3);
  assert.equal(countElements(theme, "a:effectStyleLst", "a:effectStyle"), 3);
  assert.equal(countElements(theme, "a:bgFillStyleLst", "a:solidFill|a:gradFill|a:blipFill"), 3);
});

test("writes non-empty presentation and master text styles", () => {
  const workflow = layoutWorkflow(parseWorkflow(sample));
  const files = createWorkflowPptxFiles(workflow);
  const presentation = files["ppt/presentation.xml"];
  const master = files["ppt/slideMasters/slideMaster1.xml"];

  assert.doesNotMatch(presentation, /<p:defaultTextStyle\/>/);
  assert.match(presentation, /<p:defaultTextStyle>[\s\S]*<a:lvl1pPr[\s\S]*<a:lvl9pPr/);
  assert.match(master, /<p:titleStyle>[\s\S]*<a:defPPr>[\s\S]*<a:lvl1pPr/);
  assert.match(master, /<p:bodyStyle>[\s\S]*<a:defPPr>[\s\S]*<a:lvl1pPr/);
  assert.match(master, /<p:otherStyle>[\s\S]*<a:defPPr>[\s\S]*<a:lvl1pPr/);
  assert.match(master, /<p:bodyStyle>[\s\S]*<a:lvl9pPr/);
});

test("writes expected presentation package parts and content types", () => {
  const workflow = layoutWorkflow(parseWorkflow(sample));
  const files = createWorkflowPptxFiles(workflow);
  const contentTypes = files["[Content_Types].xml"];

  [
    "ppt/presentation.xml",
    "ppt/presProps.xml",
    "ppt/viewProps.xml",
    "ppt/tableStyles.xml",
    "ppt/slides/slide1.xml",
    "ppt/notesSlides/notesSlide1.xml",
    "ppt/slideLayouts/slideLayout1.xml",
    "ppt/slideMasters/slideMaster1.xml",
    "ppt/notesMasters/notesMaster1.xml",
    "ppt/theme/theme1.xml",
  ].forEach((path) => {
    assert.ok(files[path], `expected ${path}`);
    assert.match(contentTypes, new RegExp(`PartName="/${escapeRegExp(path)}"`));
  });

  assert.match(contentTypes, /Extension="rels" ContentType="application\/vnd\.openxmlformats-package\.relationships\+xml"/);
  assert.match(contentTypes, /PartName="\/ppt\/presProps\.xml" ContentType="application\/vnd\.openxmlformats-officedocument\.presentationml\.presProps\+xml"/);
  assert.match(contentTypes, /PartName="\/ppt\/viewProps\.xml" ContentType="application\/vnd\.openxmlformats-officedocument\.presentationml\.viewProps\+xml"/);
  assert.match(contentTypes, /PartName="\/ppt\/tableStyles\.xml" ContentType="application\/vnd\.openxmlformats-officedocument\.presentationml\.tableStyles\+xml"/);
});

test("keeps package relationships and presentation r:id references consistent", () => {
  const workflow = layoutWorkflow(parseWorkflow(sample));
  const files = createWorkflowPptxFiles(workflow);
  const packageRels = parseRelationships(files["_rels/.rels"]);
  const presentationRels = parseRelationships(files["ppt/_rels/presentation.xml.rels"]);
  const presentation = files["ppt/presentation.xml"];

  assertRelationship(packageRels, {
    id: "rId3",
    type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
    target: "ppt/presentation.xml",
  });
  assertRelationship(packageRels, {
    id: "rId1",
    type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties",
    target: "docProps/app.xml",
  });
  assertRelationship(packageRels, {
    id: "rId2",
    type: "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties",
    target: "docProps/core.xml",
  });
  assertRelationship(presentationRels, {
    id: "rId2",
    type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide",
    target: "slides/slide1.xml",
  });
  assertRelationship(presentationRels, {
    id: "rId1",
    type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster",
    target: "slideMasters/slideMaster1.xml",
  });
  assertRelationship(presentationRels, {
    id: "rId3",
    type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster",
    target: "notesMasters/notesMaster1.xml",
  });
  assertRelationship(presentationRels, {
    id: "rId4",
    type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/presProps",
    target: "presProps.xml",
  });
  assertRelationship(presentationRels, {
    id: "rId5",
    type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/viewProps",
    target: "viewProps.xml",
  });
  assertRelationship(presentationRels, {
    id: "rId6",
    type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme",
    target: "theme/theme1.xml",
  });
  assertRelationship(presentationRels, {
    id: "rId7",
    type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/tableStyles",
    target: "tableStyles.xml",
  });
  assert.match(presentation, /<p:sldMasterId id="2147483648" r:id="rId1"\/>/);
  assert.match(presentation, /<p:sldId id="256" r:id="rId2"\/>/);
  assert.match(presentation, /<p:notesMasterId r:id="rId3"\/>/);
});

test("keeps slide, notes, layout, master, and theme relationships complete", () => {
  const workflow = layoutWorkflow(parseWorkflow(sample));
  const files = createWorkflowPptxFiles(workflow);
  const slideRels = parseRelationships(files["ppt/slides/_rels/slide1.xml.rels"]);
  const notesSlideRels = parseRelationships(files["ppt/notesSlides/_rels/notesSlide1.xml.rels"]);
  const layoutRels = parseRelationships(files["ppt/slideLayouts/_rels/slideLayout1.xml.rels"]);
  const masterRels = parseRelationships(files["ppt/slideMasters/_rels/slideMaster1.xml.rels"]);
  const notesMasterRels = parseRelationships(files["ppt/notesMasters/_rels/notesMaster1.xml.rels"]);

  assertRelationship(slideRels, {
    id: "rId1",
    type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout",
    target: "../slideLayouts/slideLayout1.xml",
  });
  assertRelationship(slideRels, {
    id: "rId2",
    type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide",
    target: "../notesSlides/notesSlide1.xml",
  });
  assertRelationship(notesSlideRels, {
    id: "rId1",
    type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster",
    target: "../notesMasters/notesMaster1.xml",
  });
  assertRelationship(notesSlideRels, {
    id: "rId2",
    type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide",
    target: "../slides/slide1.xml",
  });
  assertRelationship(layoutRels, {
    id: "rId1",
    type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster",
    target: "../slideMasters/slideMaster1.xml",
  });
  assertRelationship(masterRels, {
    id: "rId1",
    type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout",
    target: "../slideLayouts/slideLayout1.xml",
  });
  assertRelationship(masterRels, {
    id: "rId2",
    type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme",
    target: "../theme/theme1.xml",
  });
  assertRelationship(notesMasterRels, {
    id: "rId1",
    type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme",
    target: "../theme/theme1.xml",
  });
});

function shapeId(slideXml, name) {
  const match = slideXml.match(new RegExp(`<p:cNvPr id="(\\d+)" name="${name}"\\/>`));
  assert.ok(match, `expected shape named ${name}`);
  return Number(match[1]);
}

function shapeXml(slideXml, name) {
  const shape = Array.from(slideXml.matchAll(/<p:sp>[\s\S]*?<\/p:sp>/g), (match) => match[0])
    .find((candidate) => new RegExp(`<p:cNvPr id="\\d+" name="${name}"\\/>`).test(candidate));
  assert.ok(shape, `shape ${name} should exist`);
  return shape;
}

function nodeStrokeWidth(shape) {
  const match = shape.match(/<a:ln w="(\d+)">/);
  assert.ok(match, "node stroke width should exist");
  return Number(match[1]);
}

function shapeExtent(shape) {
  const match = shape.match(/<a:ext cx="(\d+)" cy="(\d+)"\/>/);
  assert.ok(match, "shape extent should exist");
  return { width: Number(match[1]), height: Number(match[2]) };
}

function connectionPattern(fromId, toId) {
  return new RegExp(`<a:stCxn id="${fromId}" idx="3"\\/>\\s*<a:endCxn id="${toId}" idx="1"\\/>`);
}

function connectedConnectorIndex(slideXml) {
  for (const match of slideXml.matchAll(/<p:cxnSp>[\s\S]*?<\/p:cxnSp>/g)) {
    if (match[0].includes("<a:stCxn")) return match.index;
  }
  assert.fail("expected a bound connector");
}

function countElements(xml, parentTag, childTagPattern) {
  const parent = xml.match(new RegExp(`<${parentTag}>[\\s\\S]*?<\\/${parentTag}>`));
  assert.ok(parent, `expected ${parentTag}`);
  return (parent[0].match(new RegExp(`<(${childTagPattern})(\\s|>)`, "g")) ?? []).length;
}

function parseRelationships(xml) {
  return Array.from(xml.matchAll(/<Relationship Id="([^"]+)" Type="([^"]+)" Target="([^"]+)"\/>/g), (match) => ({
    id: match[1],
    type: match[2],
    target: match[3],
  }));
}

function assertRelationship(relationships, expected) {
  assert.ok(
    relationships.some((relationship) => (
      relationship.id === expected.id
      && relationship.type === expected.type
      && relationship.target === expected.target
    )),
    `expected relationship ${JSON.stringify(expected)}`,
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
