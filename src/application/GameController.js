import { GAME_PHASE } from "../core/GameEngine.js";

const RESIZABLE_PHASES = new Set([
  GAME_PHASE.COUNTDOWN,
  GAME_PHASE.PLAYING,
  GAME_PHASE.PAUSED,
]);
const BEST_SCORE_KEY = "letter-rush.best-score";

export default class GameController {
  constructor(runtime, renderer, { storage = getBrowserStorage() } = {}) {
    this.runtime = runtime;
    this.renderer = renderer;
    this.storage = storage;
    this.bestScore = this.readBestScore();

    this.onKeyDown = this.onKeyDown.bind(this);
    this.onVisibilityChange = this.onVisibilityChange.bind(this);
    this.onResize = this.onResize.bind(this);
    this.handleSnapshot = this.handleSnapshot.bind(this);
  }

  mount() {
    this.renderer.bindActions({
      onDifficultyChange: (difficulty) => this.selectDifficulty(difficulty),
      onPlay: () => this.startGame(),
      onPause: () => this.togglePause(),
      onExit: () => this.exitToMenu(),
      onReplay: () => this.startGame(),
      onMenu: () => this.exitToMenu(),
    });

    document.addEventListener("keydown", this.onKeyDown);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    window.addEventListener("resize", this.onResize);

    this.runtime.subscribe({
      onSnapshot: this.handleSnapshot,
      onInputResult: (result) => this.renderer.showFeedback(result),
    });
    this.runtime.initialize();
  }

  handleSnapshot(snapshot) {
    const previousPhase = this.snapshot?.phase;
    const previousBestScore = this.bestScore;
    this.snapshot = snapshot;
    if (snapshot.phase === GAME_PHASE.RESULTS) {
      this.recordBestScore(snapshot.score);
    }
    this.renderer.render(
      snapshot,
      snapshot.phase === GAME_PHASE.RESULTS
        ? previousBestScore
        : this.bestScore
    );
    if (
      previousPhase === GAME_PHASE.PAUSED &&
      snapshot.phase === GAME_PHASE.PLAYING
    ) {
      this.renderer.focusGame();
    }
    if (
      previousPhase &&
      previousPhase !== GAME_PHASE.MENU &&
      snapshot.phase === GAME_PHASE.MENU
    ) {
      this.renderer.focusMenu();
    }
    if (
      previousPhase !== GAME_PHASE.COUNTDOWN &&
      snapshot.phase === GAME_PHASE.COUNTDOWN
    ) {
      this.runtime.resize(this.renderer.getGameBounds());
      this.renderer.focusGame();
    }
  }

  selectDifficulty(difficulty) {
    this.runtime.selectDifficulty(difficulty);
  }

  startGame() {
    this.runtime.start(this.snapshot?.difficulty ?? "normal");
  }

  togglePause() {
    const phase = this.snapshot?.phase;

    if (phase === GAME_PHASE.PLAYING) {
      this.runtime.pause();
    } else if (phase === GAME_PHASE.PAUSED) {
      this.runtime.resume();
    }
  }

  exitToMenu() {
    this.runtime.reset();
  }

  onKeyDown(event) {
    const phase = this.snapshot?.phase;

    if (event.key === "Escape") {
      if (phase === GAME_PHASE.PLAYING || phase === GAME_PHASE.PAUSED) {
        event.preventDefault();
        this.togglePause();
      }
      return;
    }

    if (phase !== GAME_PHASE.PLAYING || event.repeat) return;
    if (!/^[a-z]$/i.test(event.key)) return;

    event.preventDefault();
    this.runtime.key(event.key);
  }

  onVisibilityChange() {
    const phase = this.snapshot?.phase;

    if (
      document.hidden &&
      (phase === GAME_PHASE.COUNTDOWN || phase === GAME_PHASE.PLAYING)
    ) {
      this.runtime.pause();
    }
  }

  onResize() {
    if (!RESIZABLE_PHASES.has(this.snapshot?.phase)) return;
    this.runtime.resize(this.renderer.getGameBounds());
  }

  recordBestScore(score) {
    if (score <= this.bestScore) return;

    this.bestScore = score;
    try {
      this.storage.setItem(BEST_SCORE_KEY, String(score));
    } catch {
      // El juego sigue funcionando cuando el almacenamiento está deshabilitado.
    }
  }

  readBestScore() {
    try {
      const score = Number(this.storage.getItem(BEST_SCORE_KEY));
      return Number.isFinite(score) ? score : 0;
    } catch {
      return 0;
    }
  }
}

function getBrowserStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
