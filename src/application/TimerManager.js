class TimerManager {
  constructor(timerElement, onTimerEnd) {
    this.timerElement = timerElement;
    this.onTimerEnd = onTimerEnd;
    this.timerWorker = new Worker("/src/infrastructure/workers/TimerWorker.js");
    this.setupWorkerListener();
  }

  setupWorkerListener() {
    this.timerWorker.onmessage = (e) => {
      this.updateTimer(e.data.timeRemaining);
      if (e.data.timeRemaining <= 0) {
        this.onTimerEnd();
      }
    };
  }

  startTimer() {
    this.timerWorker.postMessage({ command: "start" });
  }

  stopTimer() {
    this.timerWorker.postMessage({ command: "stop" });
  }

  resetTimer() {
    this.timerWorker.postMessage({ command: "reset" });
    this.updateTimer(60);
  }

  updateTimer(timeRemaining) {
    this.timerElement.textContent = `Tiempo: ${timeRemaining}s`;
  }
}

export default TimerManager;
