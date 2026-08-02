import assert from "node:assert/strict";
import test from "node:test";

import GameWorkerRuntime from "../src/workers/GameWorkerRuntime.js";

test("INIT and SELECT_DIFFICULTY publish menu state from the worker", () => {
  const messages = [];
  const runtime = new GameWorkerRuntime({
    postMessage: (message) => messages.push(message),
    schedule: () => 1,
    cancelSchedule: () => {},
    now: () => 0,
  });

  runtime.handleMessage({ type: "INIT" });
  runtime.handleMessage({ type: "SELECT_DIFFICULTY", difficulty: "hard" });

  assert.equal(messages[0].snapshot.phase, "menu");
  assert.equal(messages[0].snapshot.difficulty, "normal");
  assert.equal(messages.at(-1).snapshot.phase, "menu");
  assert.equal(messages.at(-1).snapshot.difficulty, "hard");
  assert.equal(messages.at(-1).snapshot.timeRemaining, 45);
});

test("START publishes the countdown snapshot and schedules simulation", () => {
  const messages = [];
  let scheduledTick = null;
  const runtime = new GameWorkerRuntime({
    postMessage: (message) => messages.push(message),
    schedule: (callback) => {
      scheduledTick = callback;
      return 17;
    },
    cancelSchedule: () => {},
    now: () => 1_000,
  });

  runtime.handleMessage({
    type: "START",
    difficulty: "hard",
    bounds: { width: 800, height: 600, missY: 520 },
  });

  assert.equal(messages.length, 1);
  assert.equal(messages[0].type, "SNAPSHOT");
  assert.equal(messages[0].snapshot.phase, "countdown");
  assert.equal(messages[0].snapshot.difficulty, "hard");
  assert.equal(messages[0].snapshot.timeRemaining, 45);
  assert.equal(typeof scheduledTick, "function");
});

test("PAUSE freezes simulation and RESUME continues without consuming paused time", () => {
  const messages = [];
  const scheduledTicks = [];
  const cancelledSchedules = [];
  let currentTime = 1_000;
  let nextScheduleId = 20;
  const runtime = new GameWorkerRuntime({
    postMessage: (message) => messages.push(message),
    schedule: (callback) => {
      scheduledTicks.push(callback);
      nextScheduleId += 1;
      return nextScheduleId;
    },
    cancelSchedule: (id) => cancelledSchedules.push(id),
    now: () => currentTime,
  });

  runtime.handleMessage({
    type: "START",
    difficulty: "normal",
    bounds: { width: 800, height: 600, missY: 520 },
  });
  currentTime = 4_000;
  scheduledTicks[0]();
  runtime.handleMessage({ type: "PAUSE" });

  assert.equal(messages.at(-1).snapshot.phase, "paused");
  assert.equal(messages.at(-1).snapshot.timeRemaining, 60);
  assert.deepEqual(cancelledSchedules, [21]);

  currentTime = 9_000;
  runtime.handleMessage({ type: "RESUME" });
  currentTime = 9_500;
  scheduledTicks[1]();

  assert.equal(messages.at(-1).snapshot.phase, "playing");
  assert.equal(messages.at(-1).snapshot.timeRemaining, 59.5);
});

test("KEY publishes its input result before the updated snapshot", () => {
  const messages = [];
  let scheduledTick = null;
  let currentTime = 0;
  const runtime = new GameWorkerRuntime({
    postMessage: (message) => messages.push(message),
    schedule: (callback) => {
      scheduledTick = callback;
      return 1;
    },
    cancelSchedule: () => {},
    now: () => currentTime,
  });

  runtime.handleMessage({
    type: "START",
    difficulty: "normal",
    bounds: { width: 800, height: 600, missY: 520 },
  });
  currentTime = 3_500;
  scheduledTick();
  const character = messages.at(-1).snapshot.letters[0].character;
  runtime.handleMessage({ type: "KEY", key: character });

  assert.deepEqual(messages.at(-2), {
    type: "INPUT_RESULT",
    result: { handled: true, hit: true, character, score: 1 },
  });
  assert.equal(messages.at(-1).type, "SNAPSHOT");
});

test("RESET stops simulation and returns to the menu with the selected difficulty", () => {
  const messages = [];
  const cancelledSchedules = [];
  const runtime = new GameWorkerRuntime({
    postMessage: (message) => messages.push(message),
    schedule: () => 31,
    cancelSchedule: (id) => cancelledSchedules.push(id),
    now: () => 0,
  });

  runtime.handleMessage({
    type: "START",
    difficulty: "hard",
    bounds: { width: 800, height: 600, missY: 520 },
  });
  runtime.handleMessage({ type: "RESET" });

  assert.deepEqual(cancelledSchedules, [31]);
  assert.equal(messages.at(-1).type, "SNAPSHOT");
  assert.equal(messages.at(-1).snapshot.phase, "menu");
  assert.equal(messages.at(-1).snapshot.difficulty, "hard");
  assert.equal(messages.at(-1).snapshot.timeRemaining, 45);
});

test("simulation cancels its schedule when the game reaches results", () => {
  const messages = [];
  const cancelledSchedules = [];
  let scheduledTick = null;
  let currentTime = 0;
  const runtime = new GameWorkerRuntime({
    postMessage: (message) => messages.push(message),
    schedule: (callback) => {
      scheduledTick = callback;
      return 41;
    },
    cancelSchedule: (id) => cancelledSchedules.push(id),
    now: () => currentTime,
  });

  runtime.handleMessage({
    type: "START",
    difficulty: "hard",
    bounds: { width: 800, height: 600, missY: 520 },
  });
  currentTime = 48_000;
  scheduledTick();

  assert.equal(messages.at(-1).snapshot.phase, "results");
  assert.deepEqual(cancelledSchedules, [41]);
});

test("RESIZE applies new board bounds to subsequently generated letters", () => {
  const messages = [];
  let scheduledTick = null;
  let currentTime = 0;
  const runtime = new GameWorkerRuntime({
    postMessage: (message) => messages.push(message),
    schedule: (callback) => {
      scheduledTick = callback;
      return 1;
    },
    cancelSchedule: () => {},
    now: () => currentTime,
    engineOptions: { random: () => 0.99 },
  });

  runtime.handleMessage({
    type: "START",
    difficulty: "normal",
    bounds: { width: 800, height: 600, missY: 520 },
  });
  runtime.handleMessage({
    type: "RESIZE",
    bounds: { width: 100, height: 100, missY: 80 },
  });
  currentTime = 3_500;
  scheduledTick();

  assert.equal(messages.at(-1).snapshot.letters.length, 1);
  assert.ok(messages.at(-1).snapshot.letters[0].x <= 44);
});
