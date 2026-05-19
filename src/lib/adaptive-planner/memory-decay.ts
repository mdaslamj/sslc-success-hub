import type {
  MemoryTrackingDoc,
  RevisionQueueDoc,
  WeaknessProfileDoc,
} from "@/integrations/firebase/types";

const DAY = 24 * 60 * 60 * 1000;

/* ------------------------- retention confidence -------------------------- */

export type RetentionBand = "ok" | "reminder" | "remediation" | "recovery";

/** Threshold bands for intervention triggers. */
export const RETENTION_THRESHOLDS = {
  reminder: 70,
  remediation: 50,
  recovery: 30,
} as const;

export function retentionBand(score: number): RetentionBand {
  if (score < RETENTION_THRESHOLDS.recovery) return "recovery";
  if (score < RETENTION_THRESHOLDS.remediation) return "remediation";
  if (score < RETENTION_THRESHOLDS.reminder) return "reminder";
  return "ok";
}

export type RetentionInputs = {
  /** ms since last practice. */
  lastPracticed: number;
  /** Scheduled interval in days (1/3/7/14/30). */
  intervalDays: number;
  /** Mistakes recorded in trailing window (default 14d). */
  recentMistakes?: number;
  /** 0..1 — fraction of quiz / mock items correct, trailing window. */
  quizAccuracy?: number;
  /** 0..1 — average OCR confidence on recent answer uploads. */
  ocrQuality?: number;
  /** Precomputed decay; defaults to computeConfidenceDecay(...). */
  confidenceDecay?: number;
  now?: number;
};

/**
 * Compute composite retention confidence (0..100). Higher = better retention.
 * Weights:
 *   interval adherence  25%
 *   confidence decay    20% (inverted)
 *   recent mistakes     20% (inverted)
 *   quiz performance    25%
 *   OCR quality         10%
 */
export function computeRetentionScore(args: RetentionInputs): {
  retentionScore: number;
  inputs: Required<Omit<RetentionInputs, "now" | "lastPracticed" | "intervalDays">>;
  band: RetentionBand;
} {
  const now = args.now ?? Date.now();
  const elapsedDays = Math.max(0, (now - args.lastPracticed) / DAY);
  const interval = Math.max(1, args.intervalDays);

  // 1 when reviewed on schedule, decays linearly to 0 when 2× overdue.
  const intervalAdherence = Math.max(
    0,
    Math.min(1, 1 - Math.max(0, elapsedDays - interval) / interval),
  );

  const confidenceDecay =
    args.confidenceDecay ??
    computeConfidenceDecay(args.lastPracticed, interval, now);

  const recentMistakes = Math.max(0, args.recentMistakes ?? 0);
  // 1 when no mistakes, drops 0.2 per mistake, floor 0.
  const mistakeComponent = Math.max(0, 1 - recentMistakes * 0.2);

  const quizAccuracy = clamp01(args.quizAccuracy ?? 0.6);
  const ocrQuality = clamp01(args.ocrQuality ?? 0.7);

  const score =
    intervalAdherence * 25 +
    (1 - confidenceDecay) * 20 +
    mistakeComponent * 20 +
    quizAccuracy * 25 +
    ocrQuality * 10;

  const retentionScore = +Math.min(100, Math.max(0, score)).toFixed(1);
  return {
    retentionScore,
    band: retentionBand(retentionScore),
    inputs: {
      intervalAdherence: +intervalAdherence.toFixed(3),
      recentMistakes,
      quizAccuracy: +quizAccuracy.toFixed(3),
      ocrQuality: +ocrQuality.toFixed(3),
      confidenceDecay: +confidenceDecay.toFixed(3),
    },
  };
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

/** Adaptive interval ladder (days). */
export const INTERVAL_LADDER = [1, 3, 7, 14, 30] as const;
export type IntervalDays = (typeof INTERVAL_LADDER)[number];

/** Pick the next interval based on current confidence — higher = wider gap. */
export function intervalForConfidence(confidence: number): IntervalDays {
  if (confidence < 40) return 1;
  if (confidence < 60) return 3;
  if (confidence < 75) return 7;
  if (confidence < 90) return 14;
  return 30;
}

/** Step the interval one rung up the ladder (after a successful review). */
export function promoteInterval(current: number): IntervalDays {
  const idx = INTERVAL_LADDER.findIndex((d) => d >= current);
  if (idx === -1) return INTERVAL_LADDER[INTERVAL_LADDER.length - 1];
  return INTERVAL_LADDER[Math.min(idx + 1, INTERVAL_LADDER.length - 1)];
}

/** Step the interval one rung down (after a failed review or mistake). */
export function demoteInterval(current: number): IntervalDays {
  const idx = INTERVAL_LADDER.findIndex((d) => d >= current);
  if (idx <= 0) return INTERVAL_LADDER[0];
  return INTERVAL_LADDER[Math.max(0, idx - 1)];
}

/**
 * Compute exponential confidence decay since last practice.
 * decay = 1 - exp(-elapsedDays / halfLife). halfLife scales with interval —
 * longer intervals decay slower, matching the spacing assumption.
 */
export function computeConfidenceDecay(
  lastPracticed: number,
  intervalDays: number,
  now = Date.now(),
): number {
  const elapsedDays = Math.max(0, (now - lastPracticed) / DAY);
  const halfLife = Math.max(1, intervalDays);
  const decay = 1 - Math.exp(-elapsedDays / halfLife);
  return +Math.min(1, Math.max(0, decay)).toFixed(3);
}

/**
 * Dynamic priority score (0..100) for a revision-queue card.
 * Higher = surface this card sooner.
 */
export function computeRevisionPriority(args: {
  lastPracticed: number;
  lastMistake?: number | null;
  confidenceScore: number;
  /** 0..1 — board frequency / weightage for this chapter. */
  boardWeight?: number;
  /** Optional previous confidence — used to detect decline. */
  previousConfidence?: number;
  intervalDays: number;
  now?: number;
}): { priority: number; confidenceDecay: number } {
  const {
    lastPracticed,
    lastMistake,
    confidenceScore,
    boardWeight = 0.5,
    previousConfidence,
    intervalDays,
    now = Date.now(),
  } = args;

  const elapsedDays = Math.max(0, (now - lastPracticed) / DAY);
  // Overdue ratio: 0 when due, 1 at one interval overdue, >1 capped.
  const overdueRatio = Math.min(2, elapsedDays / Math.max(1, intervalDays));
  const timeComponent = overdueRatio * 50; // 0..100

  const confidenceDecay = computeConfidenceDecay(lastPracticed, intervalDays, now);
  const decayComponent = confidenceDecay * 100;

  const declineComponent =
    typeof previousConfidence === "number"
      ? Math.min(100, Math.max(0, previousConfidence - confidenceScore) * 2)
      : 0;

  // Mistake recurrence — recent mistakes spike priority, fade over 7 days.
  let mistakeComponent = 0;
  if (typeof lastMistake === "number" && lastMistake > 0) {
    const mistakeAgeDays = Math.max(0, (now - lastMistake) / DAY);
    mistakeComponent = Math.max(0, 100 - mistakeAgeDays * (100 / 7));
  }

  const boardComponent = Math.min(100, Math.max(0, boardWeight)) * 100;

  // Weighted blend — components in 0..100, weights sum to 1.
  const priority =
    timeComponent * 0.25 +
    decayComponent * 0.2 +
    mistakeComponent * 0.2 +
    declineComponent * 0.15 +
    boardComponent * 0.2;

  return {
    priority: +Math.min(100, Math.max(0, priority)).toFixed(1),
    confidenceDecay,
  };
}

/** Build / refresh a memory-tracking doc from the chapter's weakness profile. */
export function buildMemoryTracking(args: {
  userId: string;
  profile: WeaknessProfileDoc;
  lastPracticed?: number;
  lastMistake?: number | null;
  previous?: MemoryTrackingDoc | null;
  /** Optional retention signals — folded into retentionScore. */
  retention?: {
    recentMistakes?: number;
    quizAccuracy?: number;
    ocrQuality?: number;
  };
  now?: number;
}): MemoryTrackingDoc {
  const { userId, profile, previous, now = Date.now() } = args;
  const lastPracticed = args.lastPracticed ?? previous?.lastPracticed ?? now;
  const lastMistake = args.lastMistake ?? previous?.lastMistake ?? null;
  const nextInterval = intervalForConfidence(profile.confidenceScore);
  const confidenceDecay = computeConfidenceDecay(lastPracticed, nextInterval, now);
  const retention = computeRetentionScore({
    lastPracticed,
    intervalDays: nextInterval,
    confidenceDecay,
    recentMistakes:
      args.retention?.recentMistakes ?? previous?.retentionInputs?.recentMistakes ?? 0,
    quizAccuracy:
      args.retention?.quizAccuracy ?? previous?.retentionInputs?.quizAccuracy,
    ocrQuality:
      args.retention?.ocrQuality ?? previous?.retentionInputs?.ocrQuality,
    now,
  });
  return {
    id: profile.chapterId,
    userId,
    chapterId: profile.chapterId,
    subjectId: profile.subjectId,
    lastPracticed,
    lastMistake,
    confidenceDecay,
    nextInterval,
    marksAtRisk: profile.marksAtRisk,
    confidenceScore: profile.confidenceScore,
    retentionScore: retention.retentionScore,
    retentionInputs: retention.inputs,
    retentionBand: retention.band,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  };
}

/**
 * Recompute the dynamic fields of an existing revision-queue card given the
 * latest confidence snapshot. Pure — caller persists the returned doc.
 */
export function refreshRevisionQueueCard(args: {
  card: RevisionQueueDoc;
  confidenceScore: number;
  previousConfidence?: number;
  lastMistake?: number | null;
  boardWeight?: number;
  now?: number;
}): RevisionQueueDoc {
  const { card, confidenceScore, previousConfidence, lastMistake, boardWeight, now = Date.now() } =
    args;
  const interval = card.interval ?? intervalForConfidence(confidenceScore);
  const lastPracticed = card.lastPracticed ?? card.createdAt;
  const { priority, confidenceDecay } = computeRevisionPriority({
    lastPracticed,
    lastMistake: lastMistake ?? card.lastMistake,
    confidenceScore,
    previousConfidence: previousConfidence ?? card.confidenceScore,
    boardWeight,
    intervalDays: interval,
    now,
  });
  return {
    ...card,
    confidenceScore,
    confidenceDecay,
    interval,
    priority,
    lastMistake: lastMistake ?? card.lastMistake,
    scheduledDate: lastPracticed + interval * DAY,
    updatedAt: now,
  };
}