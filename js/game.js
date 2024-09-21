class Game {
  constructor() {
    this.menuView = document.getElementById("menu-view");
    this.gameView = document.getElementById("game-view");
    this.playButton = document.getElementById("play-button");
    this.stopButton = document.getElementById("stop-button");
    this.resumeButton = document.getElementById("resume-button");
    this.exitButton = document.getElementById("exit-button");
    this.timerElement = document.getElementById("timer");
    this.scoreElement = document.getElementById("score");
    this.countdownElement = document.getElementById("countdown");
    this.gameArea = document.getElementById("game-area");

    this.score = 0;
    this.isPlaying = false;
    this.usedLetters = new Set();

    this.letterGeneratorWorker = new Worker("js/letterGenerator.js");
    this.timerWorker = new Worker("js/timer.js");

    this.setupEventListeners();
    this.setupWorkerListeners();
  }

  setupEventListeners() {
    this.playButton.addEventListener("click", () => this.startGame());
    this.stopButton.addEventListener("click", () => this.stopGame());
    this.resumeButton.addEventListener("click", () => this.resumeGame());
    this.exitButton.addEventListener("click", () => this.exitGame());
    document.addEventListener("keydown", (e) => this.handleKeyPress(e));
  }

  setupWorkerListeners() {
    this.letterGeneratorWorker.onmessage = (e) => {
      if (e.data.type === "newLetter") {
        this.createLetter();
      }
    };

    this.timerWorker.onmessage = (e) => {
      this.updateTimer(e.data.timeRemaining);
      if (e.data.timeRemaining <= 0) {
        this.endGame();
      }
    };
  }

  startGame() {
    this.menuView.classList.add("hidden");
    this.gameView.classList.remove("hidden");
    this.startCountdown();
  }

  startCountdown() {
    let count = 3;
    this.countdownElement.textContent = count;
    this.countdownElement.classList.remove("hidden");
    const countdownInterval = setInterval(() => {
      count--;
      this.countdownElement.textContent = count;
      if (count === 0) {
        clearInterval(countdownInterval);
        this.countdownElement.classList.add("hidden");
        this.beginGameLoop();
      }
    }, 1000);
  }

  beginGameLoop() {
    this.isPlaying = true;
    this.score = 0;
    this.usedLetters.clear();
    this.updateScore();

    this.letterGeneratorWorker.postMessage({ command: "start" });
    this.timerWorker.postMessage({ command: "start" });

    requestAnimationFrame(() => this.gameLoop());
  }

  gameLoop() {
    if (this.isPlaying) {
      this.moveLetter();
      requestAnimationFrame(() => this.gameLoop());
    }
  }

  createLetter() {
    const letter = this.getRandomUnusedLetter();
    if (!letter) return;

    const letterElement = document.createElement("div");
    letterElement.className = "letter";
    letterElement.textContent = letter;
    letterElement.style.left = `${
      Math.random() * (this.gameArea.offsetWidth - 40)
    }px`;
    letterElement.style.top = "-40px";
    letterElement.style.backgroundColor = this.getRandomColor();

    this.gameArea.appendChild(letterElement);
  }

  moveLetter() {
    const letters = this.gameArea.getElementsByClassName("letter");
    for (let letter of letters) {
      const top = parseInt(letter.style.top);
      if (top >= this.gameArea.offsetHeight) {
        this.gameArea.removeChild(letter);
        this.usedLetters.delete(letter.textContent);
        this.updateScore(-1);
      } else {
        letter.style.top = `${top + 2}px`;
      }
    }
  }

  getRandomUnusedLetter() {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const unusedLetters = [...alphabet].filter(
      (letter) => !this.usedLetters.has(letter)
    );
    if (unusedLetters.length === 0) {
      this.usedLetters.clear();
      return this.getRandomUnusedLetter();
    }
    const letter =
      unusedLetters[Math.floor(Math.random() * unusedLetters.length)];
    this.usedLetters.add(letter);
    return letter;
  }

  getRandomColor() {
    const colors = [
      "#FF5733",
      "#33FF57",
      "#3357FF",
      "#FF33F1",
      "#33FFF1",
      "#F1FF33",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  handleKeyPress(e) {
    if (!this.isPlaying) return;
    const pressedKey = e.key.toUpperCase();
    const letters = this.gameArea.getElementsByClassName("letter");
    for (let letter of letters) {
      if (letter.textContent === pressedKey) {
        this.gameArea.removeChild(letter);
        this.updateScore(1);
        return;
      }
    }
  }

  updateScore(points = 0) {
    this.score += points;
    this.scoreElement.textContent = `Puntuación: ${this.score}`;
  }

  updateTimer(timeRemaining) {
    this.timerElement.textContent = `Tiempo: ${timeRemaining}s`;
  }

  stopGame() {
    this.isPlaying = false;
    this.letterGeneratorWorker.postMessage({ command: "stop" });
    this.timerWorker.postMessage({ command: "stop" });
    this.stopButton.classList.add("hidden");
    this.resumeButton.classList.remove("hidden");
  }

  resumeGame() {
    this.resumeButton.classList.add("hidden");
    this.stopButton.classList.remove("hidden");
    this.isPlaying = true;
    this.letterGeneratorWorker.postMessage({ command: "start" });
    this.timerWorker.postMessage({ command: "start" });
    requestAnimationFrame(() => this.gameLoop());
  }

  exitGame() {
    this.stopGame();
    this.gameView.classList.add("hidden");
    this.menuView.classList.remove("hidden");
    this.clearGameArea();
    this.score = 0;
    this.timerWorker.postMessage({ command: "reset" });
    this.updateScore();
    this.updateTimer(60);
    this.stopButton.classList.remove("hidden");
    this.resumeButton.classList.add("hidden");
  }

  endGame() {
    this.stopGame();
    alert(`¡Juego terminado! Tu puntuación final es: ${this.score}`);
    this.exitGame();
  }

  clearGameArea() {
    while (this.gameArea.firstChild) {
      this.gameArea.removeChild(this.gameArea.firstChild);
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new Game();
});
