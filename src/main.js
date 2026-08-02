import GameController from "./application/GameController.js?v=3";
import GameRuntime from "./application/GameRuntime.js?v=3";
import GameRenderer from "./ui/GameRenderer.js?v=3";

const renderer = new GameRenderer(document);
const runtime = new GameRuntime();
const controller = new GameController(runtime, renderer);

controller.mount();
