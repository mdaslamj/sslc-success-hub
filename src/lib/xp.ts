/**
 * XP & level math. Pure functions — easy to unit-test and call from a
 * future server function (e.g. nightly leaderboard recomputation).
 *
 * Level curve: quadratic so early levels are quick wins and later levels
 * require sustained study. xpForLevel(n) = 100 * n * (n + 1) / 2.
 *   L1 -> 100 XP, L2 -> 300, L3 -> 600, L4 -> 1000, L5 -> 1500...
 */

export type LevelInfo = {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progress: number; // 0..1 towards next level
};

export function xpThreshold(level: number): number {
  if (level <= 0) return 0;
  return Math.round((100 * level * (level + 1)) / 2);
}

export function levelFromXp(totalXp: number): LevelInfo {
  let level = 0;
  while (xpThreshold(level + 1) <= totalXp) level += 1;
  const base = xpThreshold(level);
  const next = xpThreshold(level + 1);
  const span = Math.max(1, next - base);
  const xpIntoLevel = totalXp - base;
  return {
    level,
    xpIntoLevel,
    xpForNextLevel: span,
    progress: Math.min(1, Math.max(0, xpIntoLevel / span)),
  };
}

/** Reusable XP rewards. Centralised so future tuning is one edit. */
export const XP_REWARDS = {
  focusSession: 25,
  chapterCompleted: 75,
  streakDay: 10,
  streakMilestoneBonus: 50, // applied on top of unlock XP at milestones
  studyHour: 40,
} as const;