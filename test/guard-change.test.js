import assert from "node:assert/strict";
import test from "node:test";
import { validateChangeGate } from "../scripts/guard-change.js";

test("rejects protected branches", () => {
  assert.deepEqual(validateChangeGate({ branch: "main", existingFiles: [] }), [
    'Protected branch "main" is not allowed for direct changes or pushes.',
  ]);
});

test("allows feature branches without forbidden lockfiles", () => {
  assert.deepEqual(validateChangeGate({ branch: "feature/change-gates", existingFiles: [] }), []);
});

test("rejects lockfiles from non-pnpm package managers", () => {
  assert.deepEqual(validateChangeGate({ branch: "feature/deps", existingFiles: ["package-lock.json"] }), [
    "Forbidden lockfile detected: package-lock.json. This project uses pnpm only.",
  ]);
});
