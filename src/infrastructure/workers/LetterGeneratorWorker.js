let intervalId;
let generationInterval = 500;

self.onmessage = function (e) {
  if (e.data.command === "start") {
    startGeneration();
  } else if (e.data.command === "stop") {
    stopGeneration();
  } else if (e.data.command === "setInterval") {
    setGenerationInterval(e.data.interval);
  }
};

function startGeneration() {
  stopGeneration();
  intervalId = setInterval(() => {
    self.postMessage({ type: "newLetter" });
  }, generationInterval);
}

function stopGeneration() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function setGenerationInterval(interval) {
  generationInterval = interval;
  if (intervalId) {
    startGeneration();
  }
}
