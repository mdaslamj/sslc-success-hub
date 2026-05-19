import type {
  MemoryTrackingDoc,
  RevisionQueueDoc,
  WeaknessProfileDoc,
} from "@/integrations/firebase/types";

const DAY = 24 * 60 * 60 * 1000;

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
  now?: number;
}): MemoryTrackingDoc {
  const { userId, profile, previous, now = Date.now() } = args;
  const lastPracticed = args.lastPracticed ?? previous?.lastPracticed ?? now;
  const lastMistake = args.lastMistake ?? previous?.lastMistake ?? null;
  const nextInterval = intervalForConfidence(profile.confidenceScore);
  const confidenceDecay = computeConfidenceDecay(lastPracticed, nextInterval, now);
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