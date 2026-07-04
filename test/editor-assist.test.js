import assert from "node:assert/strict";
import test from "node:test";
import { continueMarkdownList, indentMarkdownLines, moveSelectedLines } from "../src/editor-assist.js";

test("continues markdown list items with the same indentation", () => {
  const value = "## nodes\n- requester\n  - draft: 申請作成";
  const edit = continueMarkdownList(value, value.length, value.length);

  assert.deepEqual(edit, {
    value: "## nodes\n- requester\n  - draft: 申請作成\n  - ",
    selectionStart: value.length + 5,
    selectionEnd: value.length + 5,
  });
});

test("ends an empty markdown list item", () => {
  const value = "## workflow\n  - ";
  const edit = continueMarkdownList(value, value.length, value.length);

  assert.deepEqual(edit, {
    value: "## workflow\n  ",
    selectionStart: "## workflow\n  ".length,
    selectionEnd: "## workflow\n  ".length,
  });
});

test("does not handle enter outside markdown list items", () => {
  const value = "# タイトル";

  assert.equal(continueMarkdownList(value, value.length, value.length), null);
});

test("indents and outdents selected markdown lines", () => {
  const value = "- requester\n  - draft: 申請作成";
  const indented = indentMarkdownLines(value, 0, value.length, "in");

  assert.equal(indented.value, "  - requester\n    - draft: 申請作成");
  assert.equal(indented.selectionStart, 2);
  assert.equal(indented.selectionEnd, value.length + 4);

  const outdented = indentMarkdownLines(indented.value, indented.selectionStart, indented.selectionEnd, "out");

  assert.equal(outdented.value, value);
  assert.equal(outdented.selectionStart, 0);
  assert.equal(outdented.selectionEnd, value.length);
});

test("outdents by at most one indentation level", () => {
  const value = "    - draft: 申請作成";
  const edit = indentMarkdownLines(value, value.length, value.length, "out");

  assert.deepEqual(edit, {
    value: "  - draft: 申請作成",
    selectionStart: value.length - 2,
    selectionEnd: value.length - 2,
  });
});

test("moves the current line up and down", () => {
  const value = "- first\n- second\n- third";
  const lineStart = "- first\n".length;
  const lineEnd = lineStart + "- second".length;
  const movedUp = moveSelectedLines(value, lineEnd, lineEnd, "up");

  assert.deepEqual(movedUp, {
    value: "- second\n- first\n- third",
    selectionStart: lineEnd - "- first\n".length,
    selectionEnd: lineEnd - "- first\n".length,
  });

  const movedDown = moveSelectedLines(value, lineStart, lineEnd, "down");

  assert.deepEqual(movedDown, {
    value: "- first\n- third\n- second",
    selectionStart: "- first\n- third\n".length,
    selectionEnd: "- first\n- third\n- second".length,
  });
});

test("moves selected line blocks without crossing document edges", () => {
  const value = "a\nb\nc\nd";
  const blockStart = "a\n".length;
  const blockEnd = "a\nb\nc".length;
  const movedDown = moveSelectedLines(value, blockStart, blockEnd, "down");

  assert.deepEqual(movedDown, {
    value: "a\nd\nb\nc",
    selectionStart: "a\nd\n".length,
    selectionEnd: "a\nd\nb\nc".length,
  });
  assert.equal(moveSelectedLines(value, 0, 1, "up"), null);
  assert.equal(moveSelectedLines(value, value.length, value.length, "down"), null);
});
