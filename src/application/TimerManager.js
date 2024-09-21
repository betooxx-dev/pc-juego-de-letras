class TimerManager {
  constructor(timerElement, onTimerEnd) {
    this.timerElement = timerElement;
    this.onTimerEnd = onTimerEnd;
    this.timerWorker = new Worker("/src/infrastructure/workers/TimerWorker.js");
    this.setupWorkerListener();
    this.initialTime = 60;
  }

  setupWorkerListener() {
    this.timerWorker.onmessage = (e) => {
      this.updateTimer(e.data.timeRemaining);
      if (e.data.timeRemaining <= 0) {
        this.onTimerEnd();
      }
    };
  }

  setInitialTime(time) {
    this.initialTime = time;
    this.updateTimer(time);
  }

  startTimer() {
    this.timerWorker.postMessage({
      command: "start",
      initialTime: this.initialTime,
    });
  }

  stopTimer() {
    this.timerWorker.postMessage({ command: "stop" });
  }

  resetTimer() {
    this.timerWorker.postMessage({
      command: "reset",
      initialTime: this.initialTime,
    });
    this.updateTimer(this.initialTime);
  }

  updateTimer(timeRemaining) {
    this.timerElement.textContent = `Tiempo: ${timeRemaining}s`;
  }
}

export default TimerManager;
