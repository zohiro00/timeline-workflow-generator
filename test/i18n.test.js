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
