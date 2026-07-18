import assert from "node:assert/strict";
import test from "node:test";
import { captureOutputDir, captureScenarios } from "../scripts/capture-engine.js";

test("captures the README engine screenshot asset", () => {
  assert.equal(captureOutputDir.pathname.endsWith("/docs/assets/"), true);
  assert.deepEqual(
    captureScenarios.map(({ name, locale, path, viewport }) => ({ name, locale, path, viewport })),
    [
      {
        name: "engine-desktop",
        locale: "ja",
        path: "/engine",
        viewport: { width: 1440, height: 900 },
      },
      {
        name: "engine-desktop-en",
        locale: "en",
        path: "/engine",
        viewport: { width: 1440, height: 900 },
      },
    ],
  );
});
