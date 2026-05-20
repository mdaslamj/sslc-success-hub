/**
 * Pure XP + mastery-delta math for completed study sessions.
 * Keeps the engine deterministic and easily unit-tested.
 */
import { XP_REWARDS } from "@/lib/xp";

export type RewardInput = {
  focusedMinutes: number;
  pomodorosCompleted: number;
  confidence: number; // 1..5
  difficulty: number; // 1..5
  streakDays: number;
  completed: boolean;
};

export type RewardResult = {
  xpAwarded: number;
  masteryDelta: number;
  breakdown: Array<{ label: string; xp: number }>;
};

export function computeReward(input: RewardInput): RewardResult {
  const breakdown: Array<{ label: string; xp: number }> = [];

  const blockXp = input.pomodorosCompleted * XP_REWARDS.focusSession;
  if (blockXp > 0) breakdown.push({ label: `${input.pomodorosCompleted} focus block${input.pomodorosCompleted > 1 ? "s" : ""}`, xp: blockXp });

  const hourXp = Math.floor(input.focusedMinutes / 60) * XP_REWARDS.studyHour;
  if (hourXp > 0) breakdown.push({ label: "Hour milestone", xp: hourXp });

  const streakXp = input.streakDays > 0 ? XP_REWARDS.streakDay : 0;
  if (streakXp > 0) breakdown.push({ label: `Streak day +${input.streakDays}`, xp: streakXp });

  let confidenceXp = 0;
  if (input.completed && input.confidence >= 4) {
    confidenceXp = 15;
    breakdown.push({ label: "High confidence finish", xp: confidenceXp });
  } else if (input.completed && input.difficulty >= 4 && input.confidence >= 3) {
    confidenceXp = 20;
    breakdown.push({ label: "Pushed through hard topic", xp: confidenceXp });
  }

  const xpAwarded = blockXp + hourXp + streakXp + confidenceXp;

  // Mastery delta — 0..6 points per session, scaled by confidence & focus.
  const focusFactor = Math.min(1, input.focusedMinutes / 30);
  let masteryDelta = Math.round((input.confidence - 2) * focusFactor * 1.5);
  if (!input.completed) masteryDelta = Math.min(masteryDelta, 1);
  if (input.confidence <= 1) masteryDelta = -1;

  return { xpAwarded, masteryDelta, breakdown };
}