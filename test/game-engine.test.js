import assert from "node:assert/strict";
import test from "node:test";

import GameEngine, { GAME_PHASE } from "../src/core/GameEngine.js";

const NO_COUNTDOWN = { countdownMs: 0, random: () => 0 };

test("starts in the menu and exposes a serializable snapshot", () => {
  const engine = new GameEngine();
  const snapshot = engine.getSnapshot();

  assert.equal(snapshot.phase, GAME_PHASE.MENU);
  assert.equal(snapshot.difficulty, "normal");
  assert.equal(snapshot.timeRemaining, 60);
  assert.equal(snapshot.accuracy, 0);
  assert.doesNotThrow(() => JSON.stringify(snapshot));
});

test("selects difficulty and rejects changes during an active game", () => {
  const engine = new GameEngine();

  assert.equal(engine.selectDifficulty("hard").timeRemaining, 45);
  engine.start();

  assert.throws(
    () => engine.selectDifficulty("easy"),
    /cannot change while a game is active/
  );
  assert.throws(() => engine.resetToMenu() && engine.selectDifficulty("nope"), {
    name: "RangeError",
  });
});

test("advances the countdown and consumes overflow as playing time", () => {
  const engine = new GameEngine({ countdownMs: 3_000, random: () => 0 });

  assert.equal(engine.start().phase, GAME_PHASE.COUNTDOWN);
  assert.equal(engine.update(1_000).countdownRemaining, 2);

  const snapshot = engine.update(2_500);
  assert.equal(snapshot.phase, GAME_PHASE.PLAYING);
  assert.equal(snapshot.timeRemaining, 59.5);
  assert.equal(snapshot.letters.length, 1);
});

test("pause freezes time, spawning and movement; resume continues", () => {
  const engine = new GameEngine(NO_COUNTDOWN);
  engine.start();
  engine.update(1_000);
  const beforePause = engine.getSnapshot();

  assert.equal(engine.pause(), true);
  const whilePaused = engine.update(10_000);
  assert.equal(whilePaused.phase, GAME_PHASE.PAUSED);
  assert.deepEqual(whilePaused.letters, beforePause.letters);
  assert.equal(whilePaused.timeRemaining, beforePause.timeRemaining);

  assert.equal(engine.resume(), true);
  const afterResume = engine.update(100);
  assert.equal(afterResume.phase, GAME_PHASE.PLAYING);
  assert.equal(afterResume.timeRemaining, beforePause.timeRemaining - 0.1);
  assert.ok(afterResume.letters[0].y > beforePause.letters[0].y);
});

test("pause also freezes countdown and resume restores that phase", () => {
  const engine = new GameEngine({ countdownMs: 3_000 });
  engine.start();
  engine.update(1_000);

  assert.equal(engine.pause(), true);
  assert.equal(engine.update(10_000).countdownRemaining, 2);
  assert.equal(engine.resume(), true);

  const resumed = engine.update(1_000);
  assert.equal(resumed.phase, GAME_PHASE.COUNTDOWN);
  assert.equal(resumed.countdownRemaining, 1);
  assert.equal(resumed.timeRemaining, 60);
});

test("movement and spawn timing are independent of frame rate", () => {
  const manyFrames = new GameEngine(NO_COUNTDOWN);
  const oneFrame = new GameEngine(NO_COUNTDOWN);
  manyFrames.start();
  oneFrame.start();

  for (let frame = 0; frame < 15; frame += 1) manyFrames.update(100);
  oneFrame.update(1_500);

  assert.deepEqual(manyFrames.getSnapshot(), oneFrame.getSnapshot());
});

test("uses injected randomness for deterministic, unique active letters", () => {
  const engine = new GameEngine(NO_COUNTDOWN);
  engine.start();

  const snapshot = engine.update(1_000);

  assert.deepEqual(
    snapshot.letters.map(({ character, x, color }) => ({ character, x, color })),
    [
      { character: "A", x: 0, color: "#FF5733" },
      { character: "B", x: 0, color: "#FF5733" },
    ]
  );
});

test("tracks hits, wrong keys, fallen letters, score and accuracy", () => {
  const engine = new GameEngine({
    ...NO_COUNTDOWN,
    bounds: { width: 100, height: 10 },
  });
  engine.start();
  engine.update(500);

  assert.deepEqual(engine.handleKey("a"), {
    handled: true,
    hit: true,
    character: "A",
    score: 1,
  });
  assert.equal(engine.handleKey("Enter").handled, false);
  assert.equal(engine.handleKey("z").hit, false);

  engine.update(500);
  engine.update(500);
  engine.update(500);
  const snapshot = engine.getSnapshot();

  assert.equal(snapshot.hits, 1);
  assert.equal(snapshot.misses, 2);
  assert.equal(snapshot.score, -1);
  assert.equal(snapshot.accuracy, 33.3);
});

test("uses the visible danger line as the miss boundary", () => {
  const engine = new GameEngine({
    ...NO_COUNTDOWN,
    bounds: { width: 100, height: 500, missY: 100 },
  });
  engine.start();
  engine.update(500);

  const snapshot = engine.update(1_300);

  assert.equal(snapshot.misses, 1);
  assert.ok(snapshot.letters.every((letter) => letter.y < 100));
});

test("ends in results when time expires and can reset to the menu", () => {
  const engine = new GameEngine(NO_COUNTDOWN);
  engine.selectDifficulty("hard");
  engine.start();

  const results = engine.update(45_000);
  assert.equal(results.phase, GAME_PHASE.RESULTS);
  assert.equal(results.timeRemaining, 0);
  assert.deepEqual(results.letters, []);

  const menu = engine.resetToMenu();
  assert.equal(menu.phase, GAME_PHASE.MENU);
  assert.equal(menu.timeRemaining, 45);
  assert.equal(menu.score, 0);
  assert.equal(menu.hits, 0);
  assert.equal(menu.misses, 0);
});

test("returns detached snapshots", () => {
  const engine = new GameEngine(NO_COUNTDOWN);
  engine.start();
  const snapshot = engine.update(500);

  snapshot.letters[0].y = 999;

  assert.notEqual(engine.getSnapshot().letters[0].y, 999);
});
