import GameEngine, { GAME_PHASE } from "../core/GameEngine.js";

const FRAME_INTERVAL_MS = 1_000 / 60;

export default class GameWorkerRuntime {
  constructor({
    postMessage,
    schedule = (callback) => setInterval(callback, FRAME_INTERVAL_MS),
    cancelSchedule = clearInterval,
    now = () => performance.now(),
    engineOptions,
  }) {
    this.postMessage = postMessage;
    this.schedule = schedule;
    this.cancelSchedule = cancelSchedule;
    this.now = now;
    this.engine = new GameEngine(engineOptions);
    this.scheduleId = null;
    this.lastTickTime = null;
  }

  handleMessage(message) {
    if (message.type === "INIT") {
      this.postSnapshot(this.engine.getSnapshot());
      return;
    }

    if (message.type === "SELECT_DIFFICULTY") {
      this.postSnapshot(this.engine.selectDifficulty(message.difficulty));
      return;
    }

    if (message.type === "START") {
      this.stopSchedule();
      this.engine.resetToMenu();
      this.engine.selectDifficulty(message.difficulty);
      this.engine.update(0, message.bounds);
      const snapshot = this.engine.start();
      this.lastTickTime = this.now();
      this.postSnapshot(snapshot);
      this.startSchedule();
      return;
    }

    if (message.type === "PAUSE" && this.engine.pause()) {
      this.stopSchedule();
      this.postSnapshot(this.engine.getSnapshot());
      return;
    }

    if (message.type === "RESUME" && this.engine.resume()) {
      this.lastTickTime = this.now();
      this.postSnapshot(this.engine.getSnapshot());
      this.startSchedule();
      return;
    }

    if (message.type === "KEY") {
      const result = this.engine.handleKey(message.key);
      this.postMessage({ type: "INPUT_RESULT", result });
      this.postSnapshot(this.engine.getSnapshot());
      return;
    }

    if (message.type === "RESET") {
      this.stopSchedule();
      this.postSnapshot(this.engine.resetToMenu());
      return;
    }

    if (message.type === "RESIZE") {
      this.engine.update(0, message.bounds);
    }
  }

  tick() {
    const currentTime = this.now();
    const deltaMs = Math.max(0, currentTime - this.lastTickTime);
    this.lastTickTime = currentTime;
    const snapshot = this.engine.update(deltaMs);
    if (snapshot.phase === GAME_PHASE.RESULTS) this.stopSchedule();
    this.postSnapshot(snapshot);
  }

  postSnapshot(snapshot) {
    this.postMessage({ type: "SNAPSHOT", snapshot });
  }

  startSchedule() {
    this.scheduleId = this.schedule(() => this.tick());
  }

  stopSchedule() {
    if (this.scheduleId === null) return;
    this.cancelSchedule(this.scheduleId);
    this.scheduleId = null;
  }
}
