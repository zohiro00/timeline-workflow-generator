import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { extractWorkflowBlocks, layoutWorkflow, parseWorkflow, renderWorkflowSvg } from "../src/workflow.js";

const documents = [
  new URL("../docs/annotation-examples.md", import.meta.url),
  new URL("../docs/annotation-examples.en.md", import.meta.url),
];

for (const document of documents) {
  test(`renders five return annotation examples from ${document.pathname.split("/").at(-1)}`, async () => {
    const markdown = await readFile(document, "utf8");
    const blocks = extractWorkflowBlocks(markdown);

    assert.equal(blocks.length, 5);
    for (const block of blocks) {
      const workflow = layoutWorkflow(parseWorkflow(block.source));
      const svg = renderWorkflowSvg(workflow);
      assert.ok(workflow.annotations.length >= 1);
      assert.match(svg, /class="annotation annotation-return"/u);
    }
  });
}
