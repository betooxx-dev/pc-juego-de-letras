let interval;
let timeRemaining = 60;

self.onmessage = function (e) {
  switch (e.data.command) {
    case "start":
      timeRemaining = e.data.initialTime || 60;
      startTimer();
      break;
    case "stop":
      stopTimer();
      break;
    case "reset":
      resetTimer(e.data.initialTime);
      break;
  }
};

function startTimer() {
  if (!interval) {
    interval = setInterval(() => {
      timeRemaining--;
      self.postMessage({ timeRemaining });

      if (timeRemaining <= 0) {
        stopTimer();
      }
    }, 1000);
  }
}

function stopTimer() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}

function resetTimer(initialTime) {
  stopTimer();
  timeRemaining = initialTime || 60;
  self.postMessage({ timeRemaining });
}
