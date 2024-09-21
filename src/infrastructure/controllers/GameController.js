class GameController {
  constructor(gameManager, gamePresenter) {
    this.gameManager = gameManager;
    this.gamePresenter = gamePresenter;
  }

  startGame() {
    this.gamePresenter.showGameView();
    this.gamePresenter.startCountdown(() => {
      this.gameManager.startGame();
      this.beginGameLoop();
    });
  }

  stopGame() {
    this.gameManager.stopGame();
    this.gamePresenter.showResumeButton();
  }

  resumeGame() {
    this.gameManager.resumeGame();
    this.gamePresenter.showStopButton();
    this.beginGameLoop();
  }

  exitGame() {
    this.gameManager.endGame();
    this.gamePresenter.showMenuView();
    this.gameManager.scoreManager.resetScore();
    this.gameManager.timerManager.resetTimer();
    this.gamePresenter.clearGameArea();
  }

  handleKeyPress(e) {
    if (this.gameManager.isPlaying) {
      this.gameManager.handleKeyPress(e.key);
    }
  }

  beginGameLoop() {
    const loop = () => {
      if (this.gameManager.isPlaying) {
        this.gameManager.moveLetter();
        this.gamePresenter.updateGameArea(this.gameManager.letters);
        requestAnimationFrame(loop);
      }
    };
    requestAnimationFrame(loop);
  }
}

export default GameController;
