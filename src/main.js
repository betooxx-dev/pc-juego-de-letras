import GameController from "./application/GameController.js";
import GameRuntime from "./application/GameRuntime.js?v=2";
import GameRenderer from "./ui/GameRenderer.js";

const renderer = new GameRenderer(document);
const runtime = new GameRuntime();
const controller = new GameController(runtime, renderer);

controller.mount();
