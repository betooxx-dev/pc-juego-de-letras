import assert from "node:assert/strict";
import test from "node:test";

import GameRenderer from "../src/ui/GameRenderer.js";

test("identical snapshots do not rewrite HUD text", () => {
  const root = createUiRoot();
  const renderer = new GameRenderer(root);
  const snapshot = {
    phase: "menu",
    difficulty: "normal",
    timeRemaining: 60,
    countdownRemaining: 3,
    score: 0,
    hits: 0,
    misses: 0,
    accuracy: 0,
    letters: [],
  };

  renderer.render(snapshot);
  const writesAfterFirstRender = {
    timer: root.getElementById("timer").textWrites,
    score: root.getElementById("score").textWrites,
    accuracy: root.getElementById("accuracy").textWrites,
  };
  renderer.render(snapshot);

  assert.deepEqual(
    {
      timer: root.getElementById("timer").textWrites,
      score: root.getElementById("score").textWrites,
      accuracy: root.getElementById("accuracy").textWrites,
    },
    writesAfterFirstRender
  );
});

function createUiRoot() {
  const ids = [
    "menu-view",
    "game-view",
    "results-view",
    "play-button",
    "pause-button",
    "resume-button",
    "exit-button",
    "replay-button",
    "menu-button",
    "timer",
    "score",
    "accuracy",
    "current-difficulty",
    "game-area",
    "countdown-overlay",
    "countdown",
    "pause-overlay",
    "feedback",
    "final-score",
    "final-hits",
    "final-misses",
    "final-accuracy",
    "best-score",
    "result-message",
    "status-announcer",
  ];
  const elements = new Map(ids.map((id) => [id, createElement()]));
  const gameBoard = createElement();
  const dangerZone = createElement();
  const difficulties = ["easy", "normal", "hard"].map((difficulty) => {
    const element = createElement();
    element.dataset.difficulty = difficulty;
    return element;
  });

  return {
    getElementById: (id) => elements.get(id) ?? null,
    querySelectorAll: (selector) =>
      selector === ".difficulty-button" ? difficulties : [],
    querySelector: (selector) => {
      if (selector === ".game-board") return gameBoard;
      if (selector === ".danger-zone") return dangerZone;
      return null;
    },
  };
}

function createElement() {
  let text = "";
  const classes = new Set();
  const element = {
    dataset: {},
    style: { setProperty() {} },
    clientWidth: 800,
    clientHeight: 60,
    disabled: false,
    textWrites: 0,
    classList: {
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      toggle: (name, force) =>
        force === undefined
          ? classes.has(name)
            ? classes.delete(name)
            : classes.add(name)
          : force
            ? classes.add(name)
            : classes.delete(name),
      contains: (name) => classes.has(name),
    },
    setAttribute() {},
    addEventListener() {},
    appendChild() {},
    focus() {},
    remove() {},
  };
  Object.defineProperty(element, "textContent", {
    get: () => text,
    set: (value) => {
      text = String(value);
      element.textWrites += 1;
    },
  });
  return element;
}
