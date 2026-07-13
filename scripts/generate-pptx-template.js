#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const defaultOutputPath = fileURLToPath(new URL("../src/workflow-pptx-template.js", import.meta.url));
const fixedIsoTimestamp = "1980-01-01T00:00:00Z";
const generatedHeader = `// Generated from a one-slide blank deck created by a normal PPTX generator.
// Regenerate with: pnpm run pptx:template -- <blank.pptx>
// See docs/development/pptx-export.md for the template contract.
`;

export function normalizeTemplateFiles(files) {
  const normalized = { ...files };
  if (normalized["docProps/core.xml"]) {
    normalized["docProps/core.xml"] = normalized["docProps/core.xml"]
      .replace(
        /<dcterms:created xsi:type="dcterms:W3CDTF">[^<]*<\/dcterms:created>/,
        `<dcterms:created xsi:type="dcterms:W3CDTF">${fixedIsoTimestamp}</dcterms:created>`,
      )
      .replace(
        /<dcterms:modified xsi:type="dcterms:W3CDTF">[^<]*<\/dcterms:modified>/,
        `<dcterms:modified xsi:type="dcterms:W3CDTF">${fixedIsoTimestamp}</dcterms:modified>`,
      );
  }
  return normalized;
}

export function renderPptxTemplateModule(files) {
  const fileEntries = Object.entries(normalizeTemplateFiles(files));
  const entries = fileEntries
    .map(([path, content], index) => (
      `  ${JSON.stringify(path)}: ${JSON.stringify(content)}${index === fileEntries.length - 1 ? "" : ","}`
    ))
    .join("\n");

  return `${generatedHeader}export const blankPptxTemplateFiles = Object.freeze({\n${entries}\n});\n`;
}

export function extractPptxTemplateFiles(pptxPath) {
  const paths = execFileSync("unzip", ["-Z1", pptxPath], { encoding: "utf8" })
    .split("\n")
    .map((path) => path.trim())
    .filter((path) => path && !path.endsWith("/") && !path.startsWith("__MACOSX/"));
  const files = {};

  paths.forEach((path) => {
    const data = execFileSync("unzip", ["-p", pptxPath, escapeZipPath(path)]);
    if (data.includes(0)) {
      throw new Error(`Template part must be UTF-8 XML/text, got binary data in ${path}`);
    }
    files[path] = data.toString("utf8");
  });

  return files;
}

export function escapeZipPath(path) {
  return path.replaceAll("[", "\\[").replaceAll("]", "\\]");
}

export function parseTemplateGeneratorArgs(argv) {
  const [inputPath, outputPath = defaultOutputPath] = argv.slice(2).filter((argument) => argument !== "--");
  return { inputPath, outputPath };
}

function main(argv) {
  const { inputPath, outputPath } = parseTemplateGeneratorArgs(argv);
  if (!inputPath) {
    throw new Error("Usage: pnpm run pptx:template -- <blank.pptx> [output-js]");
  }

  writeFileSync(outputPath, renderPptxTemplateModule(extractPptxTemplateFiles(inputPath)));
  console.log(`Wrote ${outputPath}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
