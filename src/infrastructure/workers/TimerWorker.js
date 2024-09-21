let interval;
let timeRemaining = 60; // 60 segundos por defecto

self.onmessage = function (e) {
  switch (e.data.command) {
    case "start":
      startTimer();
      break;
    case "stop":
      stopTimer();
      break;
    case "reset":
      resetTimer();
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

function resetTimer() {
  stopTimer();
  timeRemaining = 60;
  self.postMessage({ timeRemaining });
}
