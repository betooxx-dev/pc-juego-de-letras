let score = 0;

self.onmessage = function (e) {
  switch (e.data.command) {
    case "updateScore":
      updateScore(e.data.points);
      break;
    case "resetScore":
      resetScore();
      break;
    case "getScore":
      getScore();
      break;
  }
};

function updateScore(points) {
  score += points;
  self.postMessage({ type: "scoreUpdated", score: score });
}

function resetScore() {
  score = 0;
  self.postMessage({ type: "scoreUpdated", score: score });
}

function getScore() {
  self.postMessage({ type: "currentScore", score: score });
}
