class ScoreManager {
  constructor(scoreElement) {
    this.scoreElement = scoreElement;
    this.scoreWorker = new Worker("/src/infrastructure/workers/ScoreWorker.js");
    this.setupWorkerListener();
  }

  setupWorkerListener() {
    this.scoreWorker.onmessage = (e) => {
      if (e.data.type === "scoreUpdated" || e.data.type === "currentScore") {
        this.updateScoreDisplay(e.data.score);
      }
    };
  }

  updateScore(points) {
    this.scoreWorker.postMessage({ command: "updateScore", points: points });
  }

  resetScore() {
    this.scoreWorker.postMessage({ command: "resetScore" });
  }

  getScore() {
    this.scoreWorker.postMessage({ command: "getScore" });
  }

  updateScoreDisplay(score) {
    this.scoreElement.textContent = `Puntuación: ${score}`;
  }
}

export default ScoreManager;
