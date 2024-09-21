import GameManager from "./application/GameManager.js";
import ScoreManager from "./application/ScoreManager.js";
import TimerManager from "./application/TimerManager.js";
import GameController from "../src/infrastructure/controllers/GameController.js";
import GamePresenter from "../src/infrastructure/presenters/GamePresenter.js";

document.addEventListener("DOMContentLoaded", () => {
  const menuView = document.getElementById("menu-view");
  const gameView = document.getElementById("game-view");
  const playButton = document.getElementById("play-button");
  const stopButton = document.getElementById("stop-button");
  const resumeButton = document.getElementById("resume-button");
  const exitButton = document.getElementById("exit-button");
  const timerElement = document.getElementById("timer");
  const scoreElement = document.getElementById("score");
  const countdownElement = document.getElementById("countdown");
  const gameArea = document.getElementById("game-area");

  const scoreManager = new ScoreManager(scoreElement);
  const timerManager = new TimerManager(timerElement, () =>
    gameController.exitGame()
  );
  const letterGeneratorWorker = new Worker(
    "/src/infrastructure/workers/LetterGeneratorWorker.js"
  );

  const gameManager = new GameManager(
    gameArea,
    scoreManager,
    timerManager,
    letterGeneratorWorker
  );
  const gamePresenter = new GamePresenter(
    menuView,
    gameView,
    countdownElement,
    gameArea
  );
  const gameController = new GameController(gameManager, gamePresenter);

  playButton.addEventListener("click", () => gameController.startGame());
  stopButton.addEventListener("click", () => gameController.stopGame());
  resumeButton.addEventListener("click", () => gameController.resumeGame());
  exitButton.addEventListener("click", () => gameController.exitGame());
  document.addEventListener("keydown", (e) => gameController.handleKeyPress(e));

  letterGeneratorWorker.onmessage = () => {
    if (gameManager.isPlaying) {
      gameManager.createLetter();
    }
  };
});
