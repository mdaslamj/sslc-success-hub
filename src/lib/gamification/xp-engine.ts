/**
 * Pure XP grant math for the gamification engine. Centralised so future
 * tuning (event weights, multipliers) is one edit. All functions are
 * deterministic — easy to unit-test and safe to call from server functions.
 */
import type { XpSource } from "@/integrations/firebase/types";

export type XpGrantInput = {
  source: XpSource;
  /** Optional magnitudes the source carries: minutes, items, accuracy, etc. */
  minutes?: number;
  items?: number;
  accuracy?: number; // 0..100
  confidence?: number; // 1..5
  difficulty?: number; // 1..5
  streakDays?: number;
  /** When recovering a weak topic — bigger reward for bigger jump. */
  recoveryDelta?: number; // -100..+100
};

export type XpGrant = {
  amount: number;
  breakdown: Array<{ label: string; xp: number }>;
};

/** Source-specific XP weights. Tuned for sustained engagement, not bursts. */
const WEIGHTS = {
  perFocusMinute: 1,
  perRevisionItem: 8,
  perQuizCorrect: 5,
  quizCompletion: 25,
  mockExamCompletion: 120,
  mockExamPerCorrect: 4,
  weakRecoveryBase: 35,
  weakRecoveryPerDelta: 1.2,
  plannerTaskComplete: 18,
  streakDay: 12,
  scanSolve: 14,
  reflection: 20,
  missionBase: 30,
} as const;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export function computeXpGrant(input: XpGrantInput): XpGrant {
  const out: XpGrant = { amount: 0, breakdown: [] };
  const push = (label: string, xp: number) => {
    if (xp <= 0) return;
    out.amount += xp;
    out.breakdown.push({ label, xp });
  };

  switch (input.source) {
    case "study_session": {
      const m = Math.max(0, input.minutes ?? 0);
      push(`Focus ${m}m`, Math.round(m * WEIGHTS.perFocusMinute));
      if ((input.confidence ?? 0) >= 4) push("High confidence", 10);
      break;
    }
    case "revision": {
      const n = Math.max(0, input.items ?? 1);
      push(`Revision ×${n}`, n * WEIGHTS.perRevisionItem);
      break;
    }
    case "quiz": {
      const correct = Math.max(0, input.items ?? 0);
      push("Quiz completed", WEIGHTS.quizCompletion);
      push(`Correct ×${correct}`, correct * WEIGHTS.perQuizCorrect);
      const acc = input.accuracy ?? 0;
      if (acc >= 100) push("Perfect score", 80);
      else if (acc >= 90) push("High accuracy", 40);
      break;
    }
    case "mock_exam": {
      push("Mock exam", WEIGHTS.mockExamCompletion);
      const c = Math.max(0, input.items ?? 0);
      push(`Correct ×${c}`, c * WEIGHTS.mockExamPerCorrect);
      break;
    }
    case "weak_recovery": {
      const d = clamp(input.recoveryDelta ?? 0, 0, 100);
      push("Weak topic recovered", WEIGHTS.weakRecoveryBase);
      push(`Confidence +${d}`, Math.round(d * WEIGHTS.weakRecoveryPerDelta));
      break;
    }
    case "planner_completion": {
      push("Planner task done", WEIGHTS.plannerTaskComplete);
      break;
    }
    case "streak_day": {
      const d = Math.max(1, input.streakDays ?? 1);
      const bonus = d >= 30 ? 80 : d >= 14 ? 40 : d >= 7 ? 20 : 0;
      push(`Day ${d} streak`, WEIGHTS.streakDay + bonus);
      break;
    }
    case "scan_solve":
      push("Aura solve", WEIGHTS.scanSolve);
      break;
    case "reflection":
      push("Daily reflection", WEIGHTS.reflection);
      break;
    case "mission":
      push("Mission complete", WEIGHTS.missionBase);
      break;
    case "achievement":
    case "manual":
      push("Reward", Math.max(0, input.items ?? 0));
      break;
  }

  return out;
}