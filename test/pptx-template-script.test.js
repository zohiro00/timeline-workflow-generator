import assert from "node:assert/strict";
import test from "node:test";
import {
  escapeZipPath,
  normalizeTemplateFiles,
  parseTemplateGeneratorArgs,
  renderPptxTemplateModule,
} from "../scripts/generate-pptx-template.js";

test("normalizes volatile PPTX core property timestamps", () => {
  const files = normalizeTemplateFiles({
    "docProps/core.xml": `<cp:coreProperties>
<dcterms:created xsi:type="dcterms:W3CDTF">2026-07-13T12:34:56Z</dcterms:created>
<dcterms:modified xsi:type="dcterms:W3CDTF">2026-07-13T12:35:56Z</dcterms:modified>
</cp:coreProperties>`,
  });

  assert.match(files["docProps/core.xml"], /<dcterms:created xsi:type="dcterms:W3CDTF">1980-01-01T00:00:00Z<\/dcterms:created>/);
  assert.match(files["docProps/core.xml"], /<dcterms:modified xsi:type="dcterms:W3CDTF">1980-01-01T00:00:00Z<\/dcterms:modified>/);
});

test("renders the PPTX template as an importable JavaScript module", async () => {
  const source = renderPptxTemplateModule({
    "[Content_Types].xml": "<Types/>",
    "ppt/slides/slide1.xml": "<p:sld/>",
  });
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  const module = await import(moduleUrl);

  assert.match(source, /pnpm run pptx:template -- <blank\.pptx>/);
  assert.deepEqual(module.blankPptxTemplateFiles, {
    "[Content_Types].xml": "<Types/>",
    "ppt/slides/slide1.xml": "<p:sld/>",
  });
});

test("parses pnpm run argument separators for template regeneration", () => {
  assert.deepEqual(parseTemplateGeneratorArgs(["node", "script", "--", "blank.pptx", "out.js"]), {
    inputPath: "blank.pptx",
    outputPath: "out.js",
  });
});

test("escapes zip paths that unzip treats as wildcard patterns", () => {
  assert.equal(escapeZipPath("[Content_Types].xml"), "\\[Content_Types\\].xml");
  assert.equal(escapeZipPath("ppt/slides/slide1.xml"), "ppt/slides/slide1.xml");
});
