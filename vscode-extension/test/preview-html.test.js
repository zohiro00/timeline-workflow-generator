import assert from "node:assert/strict";
import test from "node:test";
import { createPreviewHtml } from "../src/preview-html.js";

test("uses a restrictive CSP and a nonce for the webview script", () => {
  const html = createPreviewHtml("fixed-nonce");

  assert.match(html, /default-src 'none'/);
  assert.match(html, /script-src 'nonce-fixed-nonce'/);
  assert.match(html, /<script nonce="fixed-nonce">/);
  assert.doesNotMatch(html, /https?:\/\//);
});

test("renders messages as text and only injects renderer-produced SVG", () => {
  const html = createPreviewHtml("fixed-nonce");

  assert.match(html, /heading\.textContent = state\.heading/);
  assert.match(html, /message\.textContent = state\.message/);
  assert.match(html, /preview\.innerHTML = state\.svg/);
});
