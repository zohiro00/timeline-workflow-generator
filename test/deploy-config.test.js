import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Cloudflare Workers assets use SPA fallback for engine routes", () => {
  const wranglerConfig = readFileSync(new URL("../wrangler.toml", import.meta.url), "utf8");

  assert.match(wranglerConfig, /^\[assets\]$/m);
  assert.match(wranglerConfig, /^directory = "\.\/dist"$/m);
  assert.match(wranglerConfig, /^not_found_handling = "single-page-application"$/m);
});
