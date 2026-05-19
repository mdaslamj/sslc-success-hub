import type {
  BoardReadinessDoc,
  ChapterReadinessContribution,
  DifficultyLevel,
  ExamSimulationDoc,
  MemoryTrackingDoc,
  ReadinessBand,
  SemanticEvaluationDoc,
  WeaknessProfileDoc,
} from "@/integrations/firebase/types";

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export const READINESS_THRESHOLDS = {
  ready: 70,
  reminder: 50,
  remediation: 30,
} as const;

export function readinessBand(score: number): ReadinessBand {
  if (score >= READINESS_THRESHOLDS.ready) return "ready";
  if (score >= READINESS_THRESHOLDS.reminder) return "reminder";
  if (score >= READINESS_THRESHOLDS.remediation) return "remediation";
  return "recovery";
}

/**
 * Reasoning quality derived from recent semantic evaluations.
 * verdict + qualitative signals → 0..100.
 */
export function reasoningQualityFromEvaluations(
  evals: SemanticEvaluationDoc[],
): number {
  if (!evals.length) return 60; // neutral default
  const weight = (v: SemanticEvaluationDoc["verdict"]) => {
    switch (v) {
      case "equivalent":
        return 95;
      case "alternate_method":
        return 85;
      case "partially_correct":
        return 60;
      case "incorrect":
        return 25;
      case "off_topic":
        return 15;
      default:
        return 50;
    }
  };
  const recent = evals
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 20);
  const avg =
    recent.reduce((acc, e) => acc + weight(e.verdict), 0) / recent.length;
  return clamp(avg);
}

/**
 * Tutoring continuity — how consistently the learner engages the tutor
 * over time. Normalized 0..100 from session count + recency.
 */
export function tutoringContinuityScore(args: {
  sessionsLast14d: number;
  sessionsLast30d: number;
  lastSessionAt?: number;
  now?: number;
}): number {
  const now = args.now ?? Date.now();
  const recencyDays = args.lastSessionAt
    ? (now - args.lastSessionAt) / 86_400_000
    : 30;
  const recency = clamp(100 - recencyDays * 4); // 0d→100, 25d→0
  const cadence = clamp(
    Math.min(100, args.sessionsLast14d * 18 + args.sessionsLast30d * 4),
  );
  return clamp(recency * 0.4 + cadence * 0.6);
}

/**
 * Weakness severity score (0..100, higher = stronger). Inverts the
 * weakness profile risk so it adds positively to readiness.
 */
export function weaknessStrengthScore(
  profiles: WeaknessProfileDoc[],
): number {
  if (!profiles.length) return 70;
  const sev = profiles.reduce(
    (acc, p) => acc + clamp01(p.overallSeverity ?? 0.4),
    0,
  );
  const avg = sev / profiles.length;
  return clamp(100 - avg * 100);
}

export type ReadinessInputs = {
  /** Per-chapter weight (sums ≈ 1). */
  chapterWeights: Record<string, number>;
  memory: MemoryTrackingDoc[];
  weaknesses: WeaknessProfileDoc[];
  semanticEvaluations: SemanticEvaluationDoc[];
  tutoring: Parameters<typeof tutoringContinuityScore>[0];
  /** Recent mock-exam / OCR percentage (0..100). */
  recentPerformance?: number;
};

/**
 * Compute Board Readiness Index (0..100) + per-factor breakdown.
 * Weights:  memory 25, reasoning 20, continuity 10, weaknesses 20,
 *           recent performance 25.
 */
export function computeBoardReadiness(
  args: ReadinessInputs,
): Pick<BoardReadinessDoc, "readinessScore" | "band" | "contributingFactors" | "chapters"> {
  const memoryAvg = args.memory.length
    ? clamp(
        args.memory.reduce((a, m) => a + (m.retentionScore ?? 60), 0) /
          args.memory.length,
      )
    : 60;

  const reasoning = reasoningQualityFromEvaluations(args.semanticEvaluations);
  const continuity = tutoringContinuityScore(args.tutoring);
  const weaknesses = weaknessStrengthScore(args.weaknesses);
  const recentPerformance = clamp(args.recentPerformance ?? 60);

  const readinessScore = clamp(
    memoryAvg * 0.25 +
      reasoning * 0.2 +
      continuity * 0.1 +
      weaknesses * 0.2 +
      recentPerformance * 0.25,
  );

  const chapters: ChapterReadinessContribution[] = Object.entries(
    args.chapterWeights,
  ).map(([chapterId, weightage]) => {
    const mem = args.memory.find((m) => m.chapterId === chapterId);
    const wk = args.weaknesses.find((w) => w.chapterId === chapterId);
    const evalsForChapter = args.semanticEvaluations.filter(
      (e) => e.chapterId === chapterId,
    );
    return {
      chapterId,
      retentionScore: clamp(mem?.retentionScore ?? 60),
      reasoningQuality: reasoningQualityFromEvaluations(evalsForChapter),
      weaknessSeverity: clamp01(wk?.overallSeverity ?? 0.4),
      recentPerformance,
      marksAtRisk: mem?.marksAtRisk ?? 0,
      weightage,
    };
  });

  return {
    readinessScore,
    band: readinessBand(readinessScore),
    contributingFactors: {
      memory: memoryAvg,
      reasoning,
      continuity,
      weaknesses,
      recentPerformance,
    },
    chapters,
  };
}

/**
 * Choose an adaptive difficulty progression based on the readiness band.
 * recovery → easier, remediation → easier, reminder → medium, ready → board.
 */
export function recommendDifficulty(band: ReadinessBand): DifficultyLevel {
  switch (band) {
    case "ready":
      return "board";
    case "reminder":
      return "medium";
    default:
      return "easier";
  }
}

/**
 * Produce adaptive recommendations from the readiness band.
 */
export function readinessRecommendations(
  band: ReadinessBand,
): BoardReadinessDoc["recommendations"] {
  if (band === "ready") {
    return [
      {
        kind: "simulation",
        label: "Attempt a full board-level mock simulation",
        route: "/subjects/math/simulation",
      },
    ];
  }
  if (band === "reminder") {
    return [
      {
        kind: "revision_reminder",
        label: "Quick revision of weak chapters before the next mock",
        route: "/planner",
      },
    ];
  }
  if (band === "remediation") {
    return [
      {
        kind: "remediation_plan",
        label: "Run a targeted remediation plan on weak chapters",
        route: "/planner",
      },
    ];
  }
  return [
    {
      kind: "intensive_recovery",
      label: "Start the intensive recovery workflow (easier difficulty)",
      route: "/planner",
    },
  ];
}