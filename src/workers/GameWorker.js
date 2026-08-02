import GameWorkerRuntime from "./GameWorkerRuntime.js";

const runtime = new GameWorkerRuntime({
  postMessage: (message) => self.postMessage(message),
});

self.onmessage = ({ data }) => runtime.handleMessage(data);
