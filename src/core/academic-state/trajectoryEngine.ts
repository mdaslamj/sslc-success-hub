/** Trajectory shift from today's execution — future: full trajectoryEngine. */
export function computeTrajectoryShift(
  readinessDelta: number,
  completedCount: number,
): number {
  if (completedCount === 0) return 0;
  return Math.round((readinessDelta + completedCount * 0.08) * 10) / 10;
}
