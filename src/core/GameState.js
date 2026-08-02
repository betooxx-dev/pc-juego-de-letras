export const GAME_PHASE = Object.freeze({
  MENU: "menu",
  COUNTDOWN: "countdown",
  PLAYING: "playing",
  PAUSED: "paused",
  RESULTS: "results",
});

export function calculateAccuracy(hits, misses) {
  const attempts = hits + misses;

  if (attempts === 0) return 0;

  return Math.round((hits / attempts) * 1_000) / 10;
}

export function createGameState({ difficulty, durationMs, countdownMs }) {
  return {
    phase: GAME_PHASE.MENU,
    difficulty,
    timeRemainingMs: durationMs,
    countdownRemainingMs: countdownMs,
    score: 0,
    hits: 0,
    misses: 0,
    letters: [],
  };
}
