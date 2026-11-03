import test from "node:test";
import assert from "node:assert/strict";
import {
  formatWorkflowError,
  localeStorageKey,
  persistLocale,
  resolveLocale,
  translate,
  workflowLocaleOptions,
} from "../src/i18n.js";
import { getSampleWorkflowSource, getWorkflowExamples } from "../src/sample-workflow.js";
import { layoutWorkflow, parseWorkflow, renderWorkflowSvg, WorkflowError } from "../src/workflow.js";

test("resolves a stored locale before the browser language", () => {
  assert.equal(resolveLocale({ storage: memoryStorage({ [localeStorageKey]: "ja" }), languages: ["en-US"] }), "ja");
  assert.equal(resolveLocale({ storage: memoryStorage(), languages: ["ja-JP"] }), "ja");
  assert.equal(resolveLocale({ storage: memoryStorage(), languages: ["fr-FR"] }), "en");
});

test("persists only supported locales", () => {
  const storage = memoryStorage();
  persistLocale("en", storage);
  assert.equal(storage.getItem(localeStorageKey), "en");
  persistLocale("fr", storage);
  assert.equal(storage.getItem(localeStorageKey), "en");
});

test("formats structured workflow errors without changing the legacy message", () => {
  const error = new WorkflowError("レーンID \"main\" が重複しています。", 4, "lane.id-duplicate", { id: "main" });
  assert.equal(error.message, "Line 4: レーンID \"main\" が重複しています。");
  assert.equal(formatWorkflowError(error, "ja"), error.message);
  assert.equal(formatWorkflowError(error, "en"), "Line 4: Lane ID \"main\" is duplicated.");
});

test("formats shared lane and overlap errors in English", () => {
  assert.throws(
    () => parseWorkflow(`## lanes
- a: A
- b: B
- c: C
## nodes
- a + c
  - shared: Shared
- b
  - end: End
## workflow
- shared -> end`),
    (error) => {
      assert.equal(formatWorkflowError(error, "en"), 'Line 6: Shared node lanes "a, c" are not contiguous.');
      return true;
    },
  );

  assert.throws(
    () => layoutWorkflow(parseWorkflow(`## lanes
- a: A
- b: B
- c: C
## nodes
- a + b
  - shared: Shared
- b
  - normal: Normal
- c
  - end: End
## workflow
- shared -> end
- normal -> end`)),
    (error) => {
      assert.equal(formatWorkflowError(error, "en"), 'Nodes "shared" and "normal" overlap at the same position. Update the dependencies.');
      return true;
    },
  );
});

test("formats annotation errors in English", () => {
  assert.throws(
    () => parseWorkflow(`## lanes
- main: Main
### annotations
- a <- b`),
    (error) => {
      assert.equal(formatWorkflowError(error, "en"), "Line 3: Write `### annotations` inside the `## workflow` section.");
      return true;
    },
  );

  assert.throws(
    () => layoutWorkflow(parseWorkflow(`## lanes
- main: Main
## nodes
- main
  - a: A
  - b: B
## workflow
- a -> b
### annotations
- b <- a`)),
    (error) => {
      assert.equal(formatWorkflowError(error, "en"), 'Return annotation "b <- a" must point to a node earlier on the timeline.');
      return true;
    },
  );
});

test("renders locale-specific defaults and time labels", () => {
  const source = `## lanes\n- main: Main\n## nodes\n- main\n  - a: Start\n  - b: Done\n## workflow\n- a -> b`;
  const options = workflowLocaleOptions("en");
  const workflow = layoutWorkflow(parseWorkflow(source, { defaultTitle: options.defaultTitle }));
  const svg = renderWorkflowSvg(workflow, { formatTimeLabel: options.formatTimeLabel });
  assert.match(svg, /Timeline Workflow/);
  assert.match(svg, /Step 1/);
  assert.equal(translate("画像をコピー", "en"), "Copy image");
});

test("provides valid Japanese and English examples with matching IDs", () => {
  assert.deepEqual(getWorkflowExamples("ja").map(({ id }) => id), getWorkflowExamples("en").map(({ id }) => id));
  for (const locale of ["ja", "en"]) {
    assert.doesNotThrow(() => layoutWorkflow(parseWorkflow(getSampleWorkflowSource(locale))));
    getWorkflowExamples(locale).forEach(({ source }) => assert.doesNotThrow(() => layoutWorkflow(parseWorkflow(source))));
  }
});

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}
