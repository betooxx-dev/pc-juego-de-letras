import assert from "node:assert/strict";
import test from "node:test";

import GameController from "../src/application/GameController.js";
import { GAME_PHASE } from "../src/core/GameEngine.js";

test("mount subscribes to runtime state before initializing the game", (context) => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  globalThis.document = { addEventListener() {}, hidden: false };
  globalThis.window = { addEventListener() {} };
  context.after(() => {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  });

  const calls = [];
  const runtime = {
    subscribe(handlers) {
      this.handlers = handlers;
      calls.push("subscribe");
    },
    initialize() {
      calls.push("initialize");
    },
  };
  const renders = [];
  const renderer = {
    bindActions() {},
    render: (...args) => renders.push(args),
  };
  const storage = { getItem: () => null, setItem: () => {} };
  const controller = new GameController(runtime, renderer, { storage });
  const menuSnapshot = { phase: GAME_PHASE.MENU, difficulty: "normal" };

  controller.mount();
  runtime.handlers.onSnapshot(menuSnapshot);

  assert.deepEqual(calls, ["subscribe", "initialize"]);
  assert.deepEqual(renders, [[menuSnapshot, 0]]);
});

test("pause and resume follow the published phase and restore game focus", () => {
  const commands = [];
  const runtime = {
    pause: () => commands.push("pause"),
    resume: () => commands.push("resume"),
  };
  const calls = { render: 0, focusGame: 0 };
  const renderer = {
    render: () => {
      calls.render += 1;
    },
    focusGame: () => {
      calls.focusGame += 1;
    },
  };
  const storage = { getItem: () => null, setItem: () => {} };
  const controller = new GameController(runtime, renderer, { storage });
  controller.snapshot = { phase: GAME_PHASE.PLAYING };

  controller.togglePause();
  controller.handleSnapshot({ phase: GAME_PHASE.PAUSED });

  controller.togglePause();
  controller.handleSnapshot({ phase: GAME_PHASE.PLAYING });

  assert.deepEqual(commands, ["pause", "resume"]);
  assert.equal(calls.focusGame, 1);
  assert.equal(calls.render, 2);
});

test("stores a new record while rendering results against the previous best", () => {
  const result = {
    phase: GAME_PHASE.RESULTS,
    score: 8,
    hits: 8,
    misses: 1,
    accuracy: 88.9,
    letters: [],
  };
  const runtime = {};
  const renders = [];
  const renderer = {
    render: (...args) => renders.push(args),
  };
  const values = new Map([["letter-rush.best-score", "5"]]);
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const controller = new GameController(runtime, renderer, { storage });

  controller.handleSnapshot(result);

  assert.equal(controller.bestScore, 8);
  assert.equal(values.get("letter-rush.best-score"), "8");
  assert.equal(renders.length, 1);
  assert.equal(renders[0][1], 5);
});

test("difficulty, start and exit actions are delegated to the runtime", () => {
  const commands = [];
  const bounds = { width: 800, height: 600, missY: 520 };
  const runtime = {
    selectDifficulty: (difficulty) => commands.push(["difficulty", difficulty]),
    start: (difficulty) => commands.push(["start", difficulty]),
    resize: (receivedBounds) => commands.push(["resize", receivedBounds]),
    reset: () => commands.push(["reset"]),
  };
  const renderer = {
    getGameBounds: () => bounds,
    render() {},
    focusGame() {},
  };
  const storage = { getItem: () => null, setItem: () => {} };
  const controller = new GameController(runtime, renderer, { storage });
  controller.snapshot = { phase: GAME_PHASE.MENU, difficulty: "normal" };

  controller.selectDifficulty("hard");
  controller.snapshot = { phase: GAME_PHASE.MENU, difficulty: "hard" };
  controller.startGame();
  controller.handleSnapshot({
    phase: GAME_PHASE.COUNTDOWN,
    difficulty: "hard",
  });
  controller.exitToMenu();

  assert.deepEqual(commands, [
    ["difficulty", "hard"],
    ["start", "hard"],
    ["resize", bounds],
    ["reset"],
  ]);
});

test("keyboard input is delegated only while the published phase is playing", () => {
  const keys = [];
  const runtime = {
    key: (key) => keys.push(key),
    pause: () => keys.push("pause"),
  };
  const renderer = {};
  const storage = { getItem: () => null, setItem: () => {} };
  const controller = new GameController(runtime, renderer, { storage });
  const createEvent = (key, repeat = false) => ({
    key,
    repeat,
    prevented: false,
    preventDefault() {
      this.prevented = true;
    },
  });

  controller.snapshot = { phase: GAME_PHASE.PLAYING };
  const letterEvent = createEvent("A");
  controller.onKeyDown(letterEvent);
  controller.onKeyDown(createEvent("B", true));
  controller.onKeyDown(createEvent("Escape"));
  controller.snapshot = { phase: GAME_PHASE.PAUSED };
  controller.onKeyDown(createEvent("C"));

  assert.deepEqual(keys, ["A", "pause"]);
  assert.equal(letterEvent.prevented, true);
});

test("hiding the page pauses countdown or active play", (context) => {
  const originalDocument = globalThis.document;
  globalThis.document = { hidden: true };
  context.after(() => {
    globalThis.document = originalDocument;
  });
  const phases = [];
  const runtime = { pause: () => phases.push("pause") };
  const controller = new GameController(runtime, {}, {
    storage: { getItem: () => null, setItem: () => {} },
  });

  controller.snapshot = { phase: GAME_PHASE.COUNTDOWN };
  controller.onVisibilityChange();
  controller.snapshot = { phase: GAME_PHASE.PLAYING };
  controller.onVisibilityChange();
  controller.snapshot = { phase: GAME_PHASE.MENU };
  controller.onVisibilityChange();

  assert.deepEqual(phases, ["pause", "pause"]);
});

test("resizing publishes fresh game bounds only during an active game", () => {
  const bounds = { width: 390, height: 520, missY: 460 };
  const receivedBounds = [];
  const runtime = { resize: (value) => receivedBounds.push(value) };
  const renderer = { getGameBounds: () => bounds };
  const controller = new GameController(runtime, renderer, {
    storage: { getItem: () => null, setItem: () => {} },
  });

  controller.snapshot = { phase: GAME_PHASE.MENU };
  controller.onResize();
  controller.snapshot = { phase: GAME_PHASE.COUNTDOWN };
  controller.onResize();
  controller.snapshot = { phase: GAME_PHASE.PLAYING };
  controller.onResize();
  controller.snapshot = { phase: GAME_PHASE.PAUSED };
  controller.onResize();
  controller.snapshot = { phase: GAME_PHASE.RESULTS };
  controller.onResize();

  assert.deepEqual(receivedBounds, [bounds, bounds, bounds]);
});
