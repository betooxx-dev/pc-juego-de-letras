class GamePresenter {
  constructor(menuView, gameView, countdownElement, gameArea) {
    this.menuView = menuView;
    this.gameView = gameView;
    this.countdownElement = countdownElement;
    this.gameArea = gameArea;
    this.stopButton = document.getElementById("stop-button");
    this.resumeButton = document.getElementById("resume-button");
  }

  showMenuView() {
    this.menuView.classList.remove("hidden");
    this.gameView.classList.add("hidden");
  }

  showGameView() {
    this.menuView.classList.add("hidden");
    this.gameView.classList.remove("hidden");
  }

  startCountdown(callback) {
    let count = 3;
    this.countdownElement.textContent = count;
    this.countdownElement.classList.remove("hidden");
    const countdownInterval = setInterval(() => {
      count--;
      this.countdownElement.textContent = count;
      if (count === 0) {
        clearInterval(countdownInterval);
        this.countdownElement.classList.add("hidden");
        callback();
      }
    }, 1000);
  }

  showStopButton() {
    this.stopButton.classList.remove("hidden");
    this.resumeButton.classList.add("hidden");
  }

  showResumeButton() {
    this.stopButton.classList.add("hidden");
    this.resumeButton.classList.remove("hidden");
  }

  updateGameArea(letters) {
    this.clearGameArea();
    letters.forEach((letter) => {
      const letterElement = document.createElement("div");
      letterElement.className = "letter";
      letterElement.textContent = letter.character;
      letterElement.style.left = `${letter.x}px`;
      letterElement.style.top = `${letter.y}px`;
      letterElement.style.backgroundColor = letter.color;
      this.gameArea.appendChild(letterElement);
    });
  }

  clearGameArea() {
    while (this.gameArea.firstChild) {
      this.gameArea.removeChild(this.gameArea.firstChild);
    }
  }
}

export default GamePresenter;
