class ScoreManager {
  constructor(scoreElement) {
    this.scoreElement = scoreElement;
    this.score = 0;
  }

  updateScore(points) {
    this.score += points;
    this.updateScoreDisplay();
  }

  resetScore() {
    this.score = 0;
    this.updateScoreDisplay();
  }

  updateScoreDisplay() {
    this.scoreElement.textContent = `Puntuación: ${this.score}`;
  }
}

export default ScoreManager;
