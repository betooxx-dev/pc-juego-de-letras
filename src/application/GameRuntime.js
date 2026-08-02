import GameWorkerRuntime from "../workers/GameWorkerRuntime.js";

export default class GameRuntime {
  constructor({
    workerFactory = createBrowserWorker,
    requestFrame = (callback) => window.setTimeout(callback, 16),
  } = {}) {
    this.requestFrame = requestFrame;
    this.pendingSnapshot = null;
    this.frameId = null;
    this.handlers = {};
    try {
      this.worker = workerFactory();
    } catch {
      this.worker = new LocalWorkerPort();
    }
    this.worker.onmessage = ({ data }) => this.handleWorkerMessage(data);
  }

  subscribe(handlers) {
    this.handlers = handlers;
  }

  initialize() {
    this.worker.postMessage({ type: "INIT" });
  }

  selectDifficulty(difficulty) {
    this.worker.postMessage({ type: "SELECT_DIFFICULTY", difficulty });
  }

  start(difficulty, bounds) {
    this.worker.postMessage({ type: "START", difficulty, bounds });
  }

  pause() {
    this.worker.postMessage({ type: "PAUSE" });
  }

  resume() {
    this.worker.postMessage({ type: "RESUME" });
  }

  key(key) {
    this.worker.postMessage({ type: "KEY", key });
  }

  resize(bounds) {
    this.worker.postMessage({ type: "RESIZE", bounds });
  }

  reset() {
    this.worker.postMessage({ type: "RESET" });
  }

  handleWorkerMessage(message) {
    if (message.type === "INPUT_RESULT") {
      this.handlers.onInputResult?.(message.result);
      return;
    }

    if (message.type !== "SNAPSHOT") return;

    this.pendingSnapshot = message.snapshot;
    if (this.frameId !== null) return;
    this.frameId = this.requestFrame(() => this.flushSnapshot());
  }

  flushSnapshot() {
    const snapshot = this.pendingSnapshot;
    this.pendingSnapshot = null;
    this.frameId = null;
    if (snapshot) this.handlers.onSnapshot?.(snapshot);
  }
}

function createBrowserWorker() {
  return new Worker(new URL("../workers/GameWorker.js", import.meta.url), {
    type: "module",
  });
}

class LocalWorkerPort {
  constructor() {
    this.onmessage = null;
    this.runtime = new GameWorkerRuntime({
      postMessage: (data) => this.onmessage?.({ data }),
    });
  }

  postMessage(message) {
    this.runtime.handleMessage(message);
  }

  terminate() {
    this.runtime.stopSchedule();
  }
}
