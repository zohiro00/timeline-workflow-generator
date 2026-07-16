import assert from "node:assert/strict";
import test from "node:test";
import { PreviewController, previewUpdateDelayMs } from "../src/preview-controller.js";

const workflow = (title) => `\`\`\`workflow
# ${title}

## lanes
- lane: Lane

## nodes
- lane
  - start: Start
  - finish: Finish

## workflow
- start -> finish
\`\`\``;

test("follows active Markdown editors and ignores webview focus", () => {
  const states = [];
  const controller = new PreviewController({ render: (state) => states.push(state) });
  const first = document("/workspace/first.md", workflow("First"));
  const second = document("/workspace/second.md", workflow("Second"));

  controller.showInitial({ document: first });
  controller.onActiveEditorChanged(undefined);
  controller.onActiveEditorChanged({ document: second });

  assert.equal(states.length, 2);
  assert.match(states[0].svg, /First/);
  assert.match(states[1].svg, /Second/);
});

test("debounces edits to the tracked Markdown document", () => {
  const states = [];
  const timers = fakeTimers();
  const tracked = document("/workspace/flow.md", workflow("Initial"));
  const controller = new PreviewController({
    render: (state) => states.push(state),
    schedule: timers.schedule,
    cancel: timers.cancel,
  });

  controller.showInitial({ document: tracked });
  tracked.text = workflow("First edit");
  controller.onDocumentChanged(tracked);
  tracked.text = workflow("Latest edit");
  controller.onDocumentChanged(tracked);

  assert.equal(timers.pendingCount(), 1);
  assert.equal(timers.latestDelay(), previewUpdateDelayMs);
  timers.runAll();
  assert.equal(states.length, 2);
  assert.match(states[1].svg, /Latest edit/);
  assert.doesNotMatch(states[1].svg, /First edit/);
});

test("ignores changes from untracked documents", () => {
  const states = [];
  const timers = fakeTimers();
  const tracked = document("/workspace/tracked.md", workflow("Tracked"));
  const controller = new PreviewController({
    render: (state) => states.push(state),
    schedule: timers.schedule,
    cancel: timers.cancel,
  });

  controller.showInitial({ document: tracked });
  controller.onDocumentChanged(document("/workspace/other.md", workflow("Other")));

  assert.equal(timers.pendingCount(), 0);
  assert.equal(states.length, 1);
});

test("shows guidance for non-Markdown editors and closed tracked documents", () => {
  const states = [];
  const tracked = document("/workspace/flow.md", workflow("Tracked"));
  const controller = new PreviewController({ render: (state) => states.push(state) });

  controller.showInitial({ document: tracked });
  controller.onDocumentClosed(tracked);
  controller.onActiveEditorChanged({ document: document("/workspace/script.js", "", "javascript") });

  assert.equal(states.at(-2).kind, "no-markdown");
  assert.equal(states.at(-1).kind, "no-markdown");
});

test("dispose cancels pending live updates", () => {
  const states = [];
  const timers = fakeTimers();
  const tracked = document("/workspace/flow.md", workflow("Tracked"));
  const controller = new PreviewController({
    render: (state) => states.push(state),
    schedule: timers.schedule,
    cancel: timers.cancel,
  });

  controller.showInitial({ document: tracked });
  controller.onDocumentChanged(tracked);
  controller.dispose();
  timers.runAll();

  assert.equal(states.length, 1);
});

test("recovers from a workflow error after the Markdown is fixed", () => {
  const states = [];
  const timers = fakeTimers();
  const tracked = document("/workspace/flow.md", workflow("Broken").replace("start -> finish", "start => finish"));
  const controller = new PreviewController({
    render: (state) => states.push(state),
    schedule: timers.schedule,
    cancel: timers.cancel,
  });

  controller.showInitial({ document: tracked });
  assert.equal(states.at(-1).kind, "workflow-error");

  tracked.text = workflow("Fixed");
  controller.onDocumentChanged(tracked);
  timers.runAll();

  assert.equal(states.at(-1).kind, "ready");
  assert.match(states.at(-1).svg, /Fixed/);
});

function document(fileName, text, languageId = "markdown") {
  return {
    fileName,
    languageId,
    text,
    uri: { toString: () => `file://${fileName}` },
    getText() { return this.text; },
  };
}

function fakeTimers() {
  const pending = new Map();
  let id = 0;
  let lastDelay = null;
  return {
    schedule(callback, delay) {
      id += 1;
      lastDelay = delay;
      pending.set(id, callback);
      return id;
    },
    cancel(timerId) {
      pending.delete(timerId);
    },
    pendingCount: () => pending.size,
    latestDelay: () => lastDelay,
    runAll() {
      const callbacks = [...pending.values()];
      pending.clear();
      callbacks.forEach((callback) => callback());
    },
  };
}
