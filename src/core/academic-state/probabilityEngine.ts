/** Placeholder probability engine — future: AI prediction integration. */
export function computeProbabilitySnapshot(
  targetScore: number,
  predicted: number,
  mastery: number,
): number {
  const gap = targetScore - predicted;
  const k = 0.18;
  const shift = 2;
  const base = 1 / (1 + Math.exp(k * (gap - shift)));
  const adj = base * 100 + (mastery - 70) * 0.15;
  return Math.round(Math.max(5, Math.min(98, adj)));
}
