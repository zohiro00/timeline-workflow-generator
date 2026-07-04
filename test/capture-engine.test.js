import assert from "node:assert/strict";
import test from "node:test";
import { captureOutputDir, captureScenarios } from "../scripts/capture-engine.js";

test("captures the README engine screenshot asset", () => {
  assert.equal(captureOutputDir.pathname.endsWith("/docs/assets/"), true);
  assert.deepEqual(
    captureScenarios.map(({ name, path, viewport }) => ({ name, path, viewport })),
    [
      {
        name: "engine-desktop",
        path: "/engine",
        viewport: { width: 1440, height: 900 },
      },
    ],
  );
});
