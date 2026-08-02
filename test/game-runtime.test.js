import assert from "node:assert/strict";
import test from "node:test";

import GameRuntime from "../src/application/GameRuntime.js";

test("multiple worker snapshots are coalesced into the latest render cycle", () => {
  const worker = createWorkerBoundary();
  const snapshots = [];
  let scheduledFrame = null;
  const runtime = new GameRuntime({
    workerFactory: () => worker,
    requestFrame: (callback) => {
      scheduledFrame = callback;
      return 9;
    },
  });
  runtime.subscribe({ onSnapshot: (snapshot) => snapshots.push(snapshot) });

  worker.emit({ type: "SNAPSHOT", snapshot: { phase: "countdown", score: 0 } });
  worker.emit({ type: "SNAPSHOT", snapshot: { phase: "playing", score: 2 } });

  assert.equal(snapshots.length, 0);
  assert.equal(typeof scheduledFrame, "function");
  scheduledFrame();
  assert.deepEqual(snapshots, [{ phase: "playing", score: 2 }]);
});

test("game commands are sent through the worker protocol", () => {
  const worker = createWorkerBoundary();
  const runtime = new GameRuntime({
    workerFactory: () => worker,
    requestFrame: () => 1,
  });
  const bounds = { width: 800, height: 600, missY: 520 };

  runtime.initialize();
  runtime.selectDifficulty("hard");
  runtime.start("hard", bounds);
  runtime.pause();
  runtime.resume();
  runtime.key("A");
  runtime.resize(bounds);
  runtime.reset();

  assert.deepEqual(worker.messages, [
    { type: "INIT" },
    { type: "SELECT_DIFFICULTY", difficulty: "hard" },
    { type: "START", difficulty: "hard", bounds },
    { type: "PAUSE" },
    { type: "RESUME" },
    { type: "KEY", key: "A" },
    { type: "RESIZE", bounds },
    { type: "RESET" },
  ]);
});

test("input results reach subscribers immediately", () => {
  const worker = createWorkerBoundary();
  const results = [];
  const runtime = new GameRuntime({
    workerFactory: () => worker,
    requestFrame: () => 1,
  });
  runtime.subscribe({ onInputResult: (result) => results.push(result) });
  const result = { handled: true, hit: true, character: "A", score: 1 };

  worker.emit({ type: "INPUT_RESULT", result });

  assert.deepEqual(results, [result]);
});

test("the runtime falls back locally when Worker construction fails", () => {
  const snapshots = [];
  let scheduledFrame = null;
  const runtime = new GameRuntime({
    workerFactory: () => {
      throw new Error("Workers disabled");
    },
    requestFrame: (callback) => {
      scheduledFrame = callback;
      return 1;
    },
  });
  runtime.subscribe({ onSnapshot: (snapshot) => snapshots.push(snapshot) });

  runtime.start("normal", { width: 800, height: 600, missY: 520 });
  scheduledFrame();
  runtime.reset();

  assert.equal(snapshots.length, 1);
  assert.equal(snapshots[0].phase, "countdown");
  assert.equal(snapshots[0].difficulty, "normal");
});

function createWorkerBoundary() {
  return {
    onmessage: null,
    onerror: null,
    messages: [],
    postMessage(message) {
      this.messages.push(message);
    },
    terminate() {},
    emit(data) {
      this.onmessage?.({ data });
    },
  };
}
