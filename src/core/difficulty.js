export const DIFFICULTIES = Object.freeze({
  easy: Object.freeze({
    durationMs: 90_000,
    fallSpeed: 60,
    spawnIntervalMs: 1_000,
  }),
  normal: Object.freeze({
    durationMs: 60_000,
    fallSpeed: 120,
    spawnIntervalMs: 500,
  }),
  hard: Object.freeze({
    durationMs: 45_000,
    fallSpeed: 180,
    spawnIntervalMs: 300,
  }),
});

export function getDifficulty(id) {
  const difficulty = DIFFICULTIES[id];

  if (!difficulty) {
    throw new RangeError(`Unknown difficulty: ${id}`);
  }

  return difficulty;
}
