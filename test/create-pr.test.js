import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGhPrCreateArgs,
  formatPrTitle,
  parseCreatePrArgs,
  validatePrContext,
} from "../scripts/create-pr.js";

test("parses PR creation options", () => {
  assert.deepEqual(
    parseCreatePrArgs(["--", "--title", "Add guard", "--base", "main", "--body-file", "/tmp/pr.md"]),
    {
      base: "main",
      body: null,
      bodyFile: "/tmp/pr.md",
      draft: true,
      title: "Add guard",
    },
  );
});

test("formats default PR titles with codex prefix", () => {
  assert.equal(formatPrTitle("Add PR create script"), "[codex] Add PR create script");
  assert.equal(formatPrTitle("[codex] Add PR create script"), "[codex] Add PR create script");
  assert.equal(formatPrTitle("Ignored", "Custom title"), "Custom title");
});

test("rejects protected PR head branches", () => {
  assert.deepEqual(
    validatePrContext({ branch: "main" }),
    ['Protected branch "main" cannot be used as a PR head.'],
  );
});

test("builds gh pr create args without using connector-specific behavior", () => {
  assert.deepEqual(
    buildGhPrCreateArgs({
      base: "main",
      body: null,
      bodyFile: "/tmp/pr.md",
      branch: "codex/add-pr-create-script",
      draft: true,
      title: "[codex] Add PR create script",
    }),
    [
      "pr",
      "create",
      "--base",
      "main",
      "--head",
      "codex/add-pr-create-script",
      "--title",
      "[codex] Add PR create script",
      "--draft",
      "--body-file",
      "/tmp/pr.md",
    ],
  );
});
