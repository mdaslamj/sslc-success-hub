import type {
  ExplanationDepth,
  LearnerLanguage,
  LearnerPace,
  LearningProfileDoc,
  TutoringPreferencesDoc,
} from "@/integrations/firebase/types";

const EMA_ALPHA = 0.3;

export function defaultLearningProfile(userId: string): LearningProfileDoc {
  return {
    id: "profile",
    userId,
    strengths: [],
    weaknesses: [],
    preferredLanguage: "en",
    explanationDepth: "intermediate",
    pace: "balanced",
    confidenceTrend: 0,
    interactions: 0,
    lastUpdatedAt: Date.now(),
  };
}

export function defaultTutoringPreferences(
  userId: string,
): TutoringPreferencesDoc {
  return {
    id: "preferences",
    userId,
    hintDepth: "guided",
    explanationDepth: "intermediate",
    language: "en",
    kannadaFriendly: false,
    preferStepByStep: true,
    toneFormality: "casual",
    updatedAt: Date.now(),
  };
}

export function paceFromSolveSeconds(seconds: number | undefined): LearnerPace {
  if (!seconds || !Number.isFinite(seconds)) return "balanced";
  if (seconds < 45) return "fast";
  if (seconds > 180) return "slow";
  return "balanced";
}

/** Fold a new tutoring interaction into the rolling profile. */
export function applyInteraction(
  existing: LearningProfileDoc | null,
  input: {
    userId: string;
    /** -1..+1 confidence signal from this interaction. */
    confidenceDelta: number;
    solveSeconds?: number;
    strengthsAdd?: string[];
    weaknessesAdd?: string[];
    languageHint?: LearnerLanguage;
    depthHint?: ExplanationDepth;
  },
): LearningProfileDoc {
  const base = existing ?? defaultLearningProfile(input.userId);
  const trend = clamp(
    EMA_ALPHA * clamp(input.confidenceDelta, -1, 1) +
      (1 - EMA_ALPHA) * base.confidenceTrend,
    -1,
    1,
  );
  const avgSolveSeconds =
    input.solveSeconds == null
      ? base.avgSolveSeconds
      : base.avgSolveSeconds == null
        ? input.solveSeconds
        : Math.round((base.avgSolveSeconds + input.solveSeconds) / 2);
  const strengths = mergeTopList(base.strengths, input.strengthsAdd, 25);
  const weaknesses = mergeTopList(base.weaknesses, input.weaknessesAdd, 25);
  return {
    ...base,
    strengths,
    weaknesses,
    confidenceTrend: trend,
    avgSolveSeconds,
    pace: paceFromSolveSeconds(avgSolveSeconds),
    preferredLanguage: input.languageHint ?? base.preferredLanguage,
    explanationDepth: input.depthHint ?? base.explanationDepth,
    interactions: base.interactions + 1,
    lastUpdatedAt: Date.now(),
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function mergeTopList(
  base: string[],
  add: string[] | undefined,
  cap: number,
): string[] {
  if (!add || add.length === 0) return base;
  const merged = Array.from(new Set([...add, ...base]));
  return merged.slice(0, cap);
}