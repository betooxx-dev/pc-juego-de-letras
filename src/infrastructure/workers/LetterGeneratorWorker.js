let intervalId;

self.onmessage = function (e) {
  if (e.data.command === "start") {
    intervalId = setInterval(() => {
      self.postMessage({ type: "newLetter" });
    }, 500);
  } else if (e.data.command === "stop") {
    clearInterval(intervalId);
  }
};
