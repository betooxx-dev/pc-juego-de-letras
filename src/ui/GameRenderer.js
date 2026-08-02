import { GAME_PHASE } from "../core/GameEngine.js";

const DIFFICULTY_LABELS = Object.freeze({
  easy: "Fácil",
  normal: "Normal",
  hard: "Difícil",
});
const RESULT_MESSAGES = Object.freeze({
  perfect: "Precisión impecable. Ni una letra logró escapar.",
  great: "Gran coordinación: velocidad y precisión en equilibrio.",
  good: "Buen ritmo. Una partida más y superarás tu marca.",
  practice: "Ya calentaste los dedos. Vuelve a intentarlo y afina el ritmo.",
});

export default class GameRenderer {
  constructor(root = document) {
    this.root = root;
    this.elements = collectElements(root);
    this.letterElements = new Map();
    this.retiringLetters = new Set();
    this.lastPhase = null;
    this.lastCountdown = null;
    this.feedbackTimer = null;
  }

  bindActions({
    onDifficultyChange,
    onPlay,
    onPause,
    onExit,
    onReplay,
    onMenu,
  }) {
    this.elements.difficultyButtons.forEach((button) => {
      button.addEventListener("click", () => {
        onDifficultyChange(button.dataset.difficulty);
      });
    });
    this.elements.playButton.addEventListener("click", onPlay);
    this.elements.pauseButton.addEventListener("click", onPause);
    this.elements.resumeButton.addEventListener("click", onPause);
    this.elements.exitButton.addEventListener("click", onExit);
    this.elements.replayButton.addEventListener("click", onReplay);
    this.elements.menuButton.addEventListener("click", onMenu);
  }

  render(snapshot, bestScore = 0) {
    this.renderViews(snapshot.phase);
    this.renderDifficulty(snapshot.difficulty);
    this.renderHud(snapshot);
    this.renderOverlays(snapshot);
    this.renderLetters(snapshot);

    if (snapshot.phase === GAME_PHASE.RESULTS) {
      this.renderResults(snapshot, bestScore);
    }

    this.announcePhase(snapshot);
    this.lastPhase = snapshot.phase;
  }

  renderViews(phase) {
    toggleHidden(this.elements.menuView, phase !== GAME_PHASE.MENU);
    toggleHidden(
      this.elements.gameView,
      ![
        GAME_PHASE.COUNTDOWN,
        GAME_PHASE.PLAYING,
        GAME_PHASE.PAUSED,
      ].includes(phase)
    );
    toggleHidden(this.elements.resultsView, phase !== GAME_PHASE.RESULTS);
  }

  renderDifficulty(difficulty) {
    this.elements.difficultyButtons.forEach((button) => {
      const selected = button.dataset.difficulty === difficulty;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    this.elements.currentDifficulty.textContent =
      DIFFICULTY_LABELS[difficulty] ?? difficulty;
  }

  renderHud(snapshot) {
    const seconds = Math.max(0, Math.ceil(snapshot.timeRemaining));
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;

    const timerText = `${String(minutes).padStart(2, "0")}:${String(
      remainder
    ).padStart(2, "0")}`;
    setTextIfChanged(this.elements.timer, timerText);
    this.elements.timer.classList.toggle(
      "is-warning",
      seconds <= 10 && snapshot.phase === GAME_PHASE.PLAYING
    );
    setTextIfChanged(this.elements.score, String(snapshot.score));
    setTextIfChanged(this.elements.accuracy, `${formatPercentage(
      snapshot.accuracy,
      snapshot.hits + snapshot.misses === 0
    )}%`);
    const pauseDisabled = snapshot.phase !== GAME_PHASE.PLAYING;
    if (this.elements.pauseButton.disabled !== pauseDisabled) {
      this.elements.pauseButton.disabled = pauseDisabled;
    }
  }

  renderOverlays(snapshot) {
    const countingDown = snapshot.phase === GAME_PHASE.COUNTDOWN;
    const paused = snapshot.phase === GAME_PHASE.PAUSED;

    toggleHidden(this.elements.countdownOverlay, !countingDown);
    toggleHidden(this.elements.pauseOverlay, !paused);

    if (countingDown) {
      const count = Math.max(1, Math.ceil(snapshot.countdownRemaining));
      if (count !== this.lastCountdown) {
        this.elements.countdown.textContent = String(count);
        restartAnimation(this.elements.countdown);
        this.lastCountdown = count;
      }
    } else {
      this.lastCountdown = null;
    }

    if (paused && this.lastPhase !== GAME_PHASE.PAUSED) {
      requestAnimationFrame(() => this.elements.resumeButton.focus());
    }
  }

  renderLetters(snapshot) {
    if (snapshot.phase === GAME_PHASE.MENU || snapshot.phase === GAME_PHASE.RESULTS) {
      this.clearLetters();
      return;
    }

    const activeIds = new Set();
    snapshot.letters.forEach((letter) => {
      activeIds.add(letter.id);
      let element = this.letterElements.get(letter.id);

      if (!element) {
        element = document.createElement("span");
        element.className = "letter";
        element.textContent = letter.character;
        element.dataset.character = letter.character;
        element.setAttribute("aria-hidden", "true");
        element.style.setProperty("--letter-color", letter.color);
        this.elements.gameArea.appendChild(element);
        this.letterElements.set(letter.id, element);
      }

      element.style.transform = `translate3d(${letter.x}px, ${letter.y}px, 0)`;
    });

    this.letterElements.forEach((element, id) => {
      if (activeIds.has(id) || this.retiringLetters.has(id)) return;
      this.retireLetter(id, element, "is-missed");
    });
  }

  renderResults(snapshot, bestScore) {
    if (this.lastPhase !== GAME_PHASE.RESULTS) {
      this.isNewRecord = snapshot.score > bestScore && snapshot.score > 0;
      requestAnimationFrame(() => this.elements.replayButton.focus());
    }

    this.elements.finalScore.textContent = String(snapshot.score);
    this.elements.finalHits.textContent = String(snapshot.hits);
    this.elements.finalMisses.textContent = String(snapshot.misses);
    this.elements.finalAccuracy.textContent = `${formatPercentage(
      snapshot.accuracy
    )}%`;
    this.elements.bestScore.textContent = String(
      Math.max(bestScore, snapshot.score, 0)
    );
    this.elements.resultMessage.textContent = getResultMessage(
      snapshot,
      this.isNewRecord
    );
  }

  showFeedback(result) {
    const feedback = this.elements.feedback;
    const board = this.elements.gameBoard;
    const stateClass = result.hit ? "is-hit" : "is-miss";
    const boardClass = result.hit ? "hit-flash" : "miss-flash";

    window.clearTimeout(this.feedbackTimer);
    feedback.classList.remove("is-visible", "is-hit", "is-miss");
    board.classList.remove("hit-flash", "miss-flash");
    void feedback.offsetWidth;

    feedback.textContent = result.hit
      ? `+1 · ${result.character}`
      : `−1 · ${result.character}`;
    feedback.classList.add("is-visible", stateClass);
    board.classList.add(boardClass);

    if (result.hit) {
      const hitEntry = [...this.letterElements.entries()].find(
        ([, element]) => element.dataset.character === result.character
      );
      if (hitEntry) this.retireLetter(hitEntry[0], hitEntry[1], "is-hit");
    }

    this.feedbackTimer = window.setTimeout(() => {
      feedback.classList.remove("is-visible", "is-hit", "is-miss");
      board.classList.remove("hit-flash", "miss-flash");
    }, 720);
  }

  retireLetter(id, element, className) {
    this.retiringLetters.add(id);
    element.classList.add(className);
    element.addEventListener(
      "animationend",
      () => {
        element.remove();
        this.letterElements.delete(id);
        this.retiringLetters.delete(id);
      },
      { once: true }
    );
    window.setTimeout(() => {
      if (!this.retiringLetters.has(id)) return;
      element.remove();
      this.letterElements.delete(id);
      this.retiringLetters.delete(id);
    }, 400);
  }

  clearLetters() {
    this.letterElements.forEach((element) => element.remove());
    this.letterElements.clear();
    this.retiringLetters.clear();
  }

  announcePhase(snapshot) {
    if (snapshot.phase === this.lastPhase) return;

    const messages = {
      [GAME_PHASE.MENU]: "Menú principal.",
      [GAME_PHASE.COUNTDOWN]: "La partida comenzará en tres segundos.",
      [GAME_PHASE.PLAYING]:
        this.lastPhase === GAME_PHASE.PAUSED
          ? "Partida reanudada."
          : "Comienza la partida.",
      [GAME_PHASE.PAUSED]: "Partida en pausa.",
      [GAME_PHASE.RESULTS]: `Partida terminada. Puntuación ${snapshot.score}.`,
    };

    this.elements.announcer.textContent = messages[snapshot.phase] ?? "";
  }

  getGameBounds() {
    const height = Math.max(1, this.elements.gameArea.clientHeight);
    const dangerZoneHeight = this.elements.dangerZone.clientHeight;

    return {
      width: Math.max(1, this.elements.gameArea.clientWidth),
      height,
      missY: Math.max(1, height - dangerZoneHeight),
    };
  }

  focusGame() {
    requestAnimationFrame(() => this.elements.gameArea.focus());
  }

  focusMenu() {
    requestAnimationFrame(() => this.elements.playButton.focus());
  }
}

function collectElements(root) {
  const required = (id) => {
    const element = root.getElementById(id);
    if (!element) throw new Error(`Missing required UI element: #${id}`);
    return element;
  };
  const requiredSelector = (selector) => {
    const element = root.querySelector(selector);
    if (!element) throw new Error(`Missing required UI element: ${selector}`);
    return element;
  };

  return {
    menuView: required("menu-view"),
    gameView: required("game-view"),
    resultsView: required("results-view"),
    difficultyButtons: [...root.querySelectorAll(".difficulty-button")],
    playButton: required("play-button"),
    pauseButton: required("pause-button"),
    resumeButton: required("resume-button"),
    exitButton: required("exit-button"),
    replayButton: required("replay-button"),
    menuButton: required("menu-button"),
    timer: required("timer"),
    score: required("score"),
    accuracy: required("accuracy"),
    currentDifficulty: required("current-difficulty"),
    gameBoard: requiredSelector(".game-board"),
    gameArea: required("game-area"),
    countdownOverlay: required("countdown-overlay"),
    countdown: required("countdown"),
    pauseOverlay: required("pause-overlay"),
    feedback: required("feedback"),
    finalScore: required("final-score"),
    finalHits: required("final-hits"),
    finalMisses: required("final-misses"),
    finalAccuracy: required("final-accuracy"),
    bestScore: required("best-score"),
    resultMessage: required("result-message"),
    announcer: required("status-announcer"),
    dangerZone: requiredSelector(".danger-zone"),
  };
}

function toggleHidden(element, hidden) {
  element.classList.toggle("hidden", hidden);
  element.setAttribute("aria-hidden", String(hidden));
}

function setTextIfChanged(element, value) {
  if (element.textContent !== value) element.textContent = value;
}

function formatPercentage(value, empty = false) {
  if (empty) return "100";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function getResultMessage(snapshot, isNewRecord) {
  if (isNewRecord) {
    return "¡Nuevo récord personal! Tu próximo objetivo ya está en la mira.";
  }
  if (snapshot.accuracy === 100 && snapshot.hits > 0) return RESULT_MESSAGES.perfect;
  if (snapshot.accuracy >= 85) return RESULT_MESSAGES.great;
  if (snapshot.accuracy >= 60) return RESULT_MESSAGES.good;
  return RESULT_MESSAGES.practice;
}

function restartAnimation(element) {
  element.style.animation = "none";
  void element.offsetWidth;
  element.style.animation = "";
}
