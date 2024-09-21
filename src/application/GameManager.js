import Letter from "../domain/Letter.js";

class GameManager {
  constructor(gameArea, scoreManager, timerManager, letterGeneratorWorker) {
    this.gameArea = gameArea;
    this.scoreManager = scoreManager;
    this.timerManager = timerManager;
    this.letterGeneratorWorker = letterGeneratorWorker;
    this.letters = [];
    this.isPlaying = false;
    this.usedLetters = new Set();
  }

  startGame() {
    this.isPlaying = true;
    this.clearLetters();
    this.usedLetters.clear();
    this.scoreManager.resetScore();
    this.timerManager.startTimer();
    this.letterGeneratorWorker.postMessage({ command: "start" });
  }

  stopGame() {
    this.isPlaying = false;
    this.timerManager.stopTimer();
    this.letterGeneratorWorker.postMessage({ command: "stop" });
  }

  resumeGame() {
    this.isPlaying = true;
    this.timerManager.startTimer();
    this.letterGeneratorWorker.postMessage({ command: "start" });
  }

  endGame() {
    this.stopGame();
    this.clearLetters();
  }

  clearLetters() {
    this.letters = [];
    this.gameArea.innerHTML = "";
  }

  createLetter() {
    const letter = this.getRandomUnusedLetter();
    if (!letter) return;

    const x = Math.random() * (this.gameArea.offsetWidth - 40);
    const y = -40;
    const color = this.getRandomColor();

    const newLetter = new Letter(letter, x, y, color);
    this.letters.push(newLetter);
  }

  moveLetter() {
    this.letters = this.letters.filter((letter) => {
      letter.move(2);
      if (letter.y >= this.gameArea.offsetHeight) {
        this.usedLetters.delete(letter.character);
        this.scoreManager.updateScore(-1);
        return false;
      }
      return true;
    });
  }

  handleKeyPress(pressedKey) {
    const index = this.letters.findIndex(
      (letter) => letter.character === pressedKey.toUpperCase()
    );
    if (index !== -1) {
      this.letters.splice(index, 1);
      this.scoreManager.updateScore(1);
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
}

export default GameManager;
