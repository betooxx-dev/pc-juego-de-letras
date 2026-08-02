import { DIFFICULTIES, getDifficulty } from "./difficulty.js";
import {
  GAME_PHASE,
  calculateAccuracy,
  createGameState,
} from "./GameState.js";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const COLORS = Object.freeze([
  "#FF5733",
  "#33FF57",
  "#3357FF",
  "#FF33F1",
  "#33FFF1",
  "#F1FF33",
]);
const DEFAULT_BOUNDS = Object.freeze({ width: 800, height: 600 });
const LETTER_SIZE = 56;
const EPSILON = 0.000_001;

export default class GameEngine {
  constructor({
    difficulty = "normal",
    countdownMs = 3_000,
    random = Math.random,
    bounds = DEFAULT_BOUNDS,
  } = {}) {
    if (typeof random !== "function") {
      throw new TypeError("random must be a function");
    }

    this.random = random;
    this.countdownMs = validateDuration(countdownMs, "countdownMs");
    this.bounds = validateBounds(bounds);
    this.spawnElapsedMs = 0;
    this.nextLetterId = 1;
    this.pausedPhase = null;

    const settings = getDifficulty(difficulty);
    this.state = createGameState({
      difficulty,
      durationMs: settings.durationMs,
      countdownMs: this.countdownMs,
    });
  }

  selectDifficulty(difficulty) {
    const settings = getDifficulty(difficulty);

    if (
      this.state.phase === GAME_PHASE.COUNTDOWN ||
      this.state.phase === GAME_PHASE.PLAYING ||
      this.state.phase === GAME_PHASE.PAUSED
    ) {
      throw new Error("Difficulty cannot change while a game is active");
    }

    this.state.difficulty = difficulty;
    this.state.timeRemainingMs = settings.durationMs;
    return this.getSnapshot();
  }

  start() {
    const settings = getDifficulty(this.state.difficulty);
    this.state = createGameState({
      difficulty: this.state.difficulty,
      durationMs: settings.durationMs,
      countdownMs: this.countdownMs,
    });
    this.state.phase =
      this.countdownMs === 0 ? GAME_PHASE.PLAYING : GAME_PHASE.COUNTDOWN;
    this.spawnElapsedMs = 0;
    this.nextLetterId = 1;
    this.pausedPhase = null;
    return this.getSnapshot();
  }

  pause() {
    if (
      this.state.phase !== GAME_PHASE.COUNTDOWN &&
      this.state.phase !== GAME_PHASE.PLAYING
    ) {
      return false;
    }

    this.pausedPhase = this.state.phase;
    this.state.phase = GAME_PHASE.PAUSED;
    return true;
  }

  resume() {
    if (this.state.phase !== GAME_PHASE.PAUSED) return false;

    this.state.phase = this.pausedPhase ?? GAME_PHASE.PLAYING;
    this.pausedPhase = null;
    return true;
  }

  update(deltaMs, bounds) {
    validateDuration(deltaMs, "deltaMs");
    if (bounds) this.bounds = validateBounds(bounds);

    if (this.state.phase === GAME_PHASE.COUNTDOWN) {
      const countdownStep = Math.min(
        deltaMs,
        this.state.countdownRemainingMs
      );
      this.state.countdownRemainingMs -= countdownStep;

      if (this.state.countdownRemainingMs <= EPSILON) {
        this.state.countdownRemainingMs = 0;
        this.state.phase = GAME_PHASE.PLAYING;
        this.update(deltaMs - countdownStep);
      }
    } else if (this.state.phase === GAME_PHASE.PLAYING) {
      this.updatePlaying(deltaMs);
    }

    return this.getSnapshot();
  }

  handleKey(key) {
    if (this.state.phase !== GAME_PHASE.PLAYING) {
      return { handled: false, hit: false };
    }

    const character = normalizeCharacter(key);
    if (!character) return { handled: false, hit: false };

    const letterIndex = this.state.letters.findIndex(
      (letter) => letter.character === character
    );
    const hit = letterIndex !== -1;

    if (hit) {
      this.state.letters.splice(letterIndex, 1);
      this.state.hits += 1;
      this.state.score += 1;
    } else {
      this.registerMiss();
    }

    return {
      handled: true,
      hit,
      character,
      score: this.state.score,
    };
  }

  end() {
    if (
      this.state.phase === GAME_PHASE.MENU ||
      this.state.phase === GAME_PHASE.RESULTS
    ) {
      return this.getSnapshot();
    }

    this.state.phase = GAME_PHASE.RESULTS;
    this.pausedPhase = null;
    this.state.countdownRemainingMs = 0;
    this.state.letters = [];
    return this.getSnapshot();
  }

  resetToMenu() {
    const settings = getDifficulty(this.state.difficulty);
    this.state = createGameState({
      difficulty: this.state.difficulty,
      durationMs: settings.durationMs,
      countdownMs: this.countdownMs,
    });
    this.spawnElapsedMs = 0;
    this.nextLetterId = 1;
    this.pausedPhase = null;
    return this.getSnapshot();
  }

  getSnapshot() {
    return {
      phase: this.state.phase,
      difficulty: this.state.difficulty,
      timeRemaining: this.state.timeRemainingMs / 1_000,
      countdownRemaining: this.state.countdownRemainingMs / 1_000,
      score: this.state.score,
      hits: this.state.hits,
      misses: this.state.misses,
      accuracy: calculateAccuracy(this.state.hits, this.state.misses),
      letters: this.state.letters.map((letter) => ({ ...letter })),
    };
  }

  updatePlaying(deltaMs) {
    let pendingMs = deltaMs;
    const settings = getDifficulty(this.state.difficulty);

    while (pendingMs > EPSILON && this.state.phase === GAME_PHASE.PLAYING) {
      const untilSpawnMs = settings.spawnIntervalMs - this.spawnElapsedMs;
      const stepMs = Math.min(
        pendingMs,
        this.state.timeRemainingMs,
        untilSpawnMs
      );

      this.moveLetters(settings.fallSpeed, stepMs);
      this.state.timeRemainingMs -= stepMs;
      this.spawnElapsedMs += stepMs;
      pendingMs -= stepMs;

      if (this.state.timeRemainingMs <= EPSILON) {
        this.state.timeRemainingMs = 0;
        this.end();
        break;
      }

      if (this.spawnElapsedMs >= settings.spawnIntervalMs - EPSILON) {
        this.spawnElapsedMs = 0;
        this.spawnLetter();
      }
    }
  }

  moveLetters(fallSpeed, deltaMs) {
    const distance = fallSpeed * (deltaMs / 1_000);
    const activeLetters = [];

    for (const letter of this.state.letters) {
      letter.y += distance;

      if (letter.y >= this.bounds.missY) {
        this.registerMiss();
      } else {
        activeLetters.push(letter);
      }
    }

    this.state.letters = activeLetters;
  }

  spawnLetter() {
    const activeCharacters = new Set(
      this.state.letters.map((letter) => letter.character)
    );
    const availableCharacters = [...ALPHABET].filter(
      (character) => !activeCharacters.has(character)
    );

    if (availableCharacters.length === 0) return;

    const character = pickRandom(availableCharacters, this.random);
    const color = pickRandom(COLORS, this.random);
    const maxX = Math.max(0, this.bounds.width - LETTER_SIZE);

    this.state.letters.push({
      id: this.nextLetterId,
      character,
      x: this.random() * maxX,
      y: -LETTER_SIZE,
      color,
    });
    this.nextLetterId += 1;
  }

  registerMiss() {
    this.state.misses += 1;
    this.state.score -= 1;
  }
}

function normalizeCharacter(key) {
  if (typeof key !== "string" || key.length !== 1) return null;

  const character = key.toUpperCase();
  return ALPHABET.includes(character) ? character : null;
}

function pickRandom(items, random) {
  const value = random();
  const index = Math.min(items.length - 1, Math.floor(value * items.length));
  return items[Math.max(0, index)];
}

function validateDuration(value, name) {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite, non-negative number`);
  }

  return value;
}

function validateBounds(bounds) {
  const width = Number(bounds?.width);
  const height = Number(bounds?.height);
  const missY = Number(bounds?.missY ?? height);

  if (!Number.isFinite(width) || width <= 0) {
    throw new RangeError("bounds.width must be a positive number");
  }

  if (!Number.isFinite(height) || height <= 0) {
    throw new RangeError("bounds.height must be a positive number");
  }

  if (!Number.isFinite(missY) || missY <= 0 || missY > height) {
    throw new RangeError("bounds.missY must be within the game height");
  }

  return { width, height, missY };
}

export { DIFFICULTIES, GAME_PHASE };
