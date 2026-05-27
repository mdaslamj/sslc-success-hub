import type {
  AnalyticsDimension,
  AnalyticsState,
  SessionRecord,
  Trend,
} from "@/types/aura-engine-contracts";

import seedProfile from "@/data/StudentLearningProfile.json";

export type AnalyticsResult = AnalyticsState;

const DIMENSION_LABELS = {
  consistency: {
    label: "Consistency",
    description: "How regularly student practices across days and subjects",
    signals: ["streakLength", "sessionFrequency", "subjectBalance"],
  },
  accuracy: {
    label: "Accuracy",
    description: "Average correctness across practice sessions",
    signals: ["avgSessionScore", "firstAttemptAccuracy", "errorRepeatRate"],
  },
  recovery: {
    label: "Recovery",
    description: "How effectively student addresses weak chapters after identification",
    signals: ["weakChapterRevisitRate", "masteryGainAfterRecovery", "sessionFollowThrough"],
  },
  momentum: {
    label: "Momentum",
    description: "Study energy and directional progress",
    signals: ["streakCurrent", "recentScoreTrend", "sessionDurationTrend"],
  },
  discipline: {
    label: "Discipline",
    description: "Whether student follows recommended plans vs freestyle studying",
    signals: ["planFollowRate", "sessionCompletionRate", "skipRate"],
  },
  confidenceStability: {
    label: "Confidence Stability",
    description:
      "Whether performance is consistent or panic-driven. Two students at 85% can differ here.",
    signals: ["scoreVariance", "panicIndex", "examVsPracticeGap", "timeOnHardProblems"],
  },
} as const;

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number): number {
  return Math.round(value);
}

function parseDate(value: string): number {
  return new Date(`${value}T00:00:00Z`).getTime();
}

function isPracticeSession(session: SessionRecord): boolean {
  return session.questionsAttempted > 0;
}

function isSkipSession(session: SessionRecord): boolean {
  return (
    session.questionsAttempted === 0 ||
    session.completedPlan === false ||
    Boolean(session.skipReason)
  );
}

function uniqueSortedDates(sessions: SessionRecord[]): string[] {
  return [...new Set(sessions.map((s) => s.date))].sort(
    (a, b) => parseDate(a) - parseDate(b),
  );
}

function longestStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  let longest = 1;
  let current = 1;

  for (let i = 1; i < dates.length; i += 1) {
    const prev = parseDate(dates[i - 1]!);
    const next = parseDate(dates[i]!);
    const dayGap = (next - prev) / (1000 * 60 * 60 * 24);

    if (dayGap === 1) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
}

function currentStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  let streak = 1;
  for (let i = dates.length - 1; i > 0; i -= 1) {
    const prev = parseDate(dates[i - 1]!);
    const next = parseDate(dates[i]!);
    const dayGap = (next - prev) / (1000 * 60 * 60 * 24);
    if (dayGap === 1) streak += 1;
    else break;
  }

  return streak;
}

function subjectBalanceScore(practiceSessions: SessionRecord[]): number {
  const counts = { math: 0, science: 0, social: 0 };
  practiceSessions.forEach((session) => {
    if (session.subject) counts[session.subject] += 1;
  });

  const values = Object.values(counts);
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total === 0) return 0;

  const ideal = total / 3;
  const deviation =
    values.reduce((sum, value) => sum + Math.abs(value - ideal), 0) / (2 * ideal);
  return clamp(100 - deviation * 100);
}

function scoreTrend(recentAvg: number, olderAvg: number): Trend {
  const delta = recentAvg - olderAvg;
  if (delta >= 3) return "improving";
  if (delta <= -3) return "declining";
  return "stable";
}

function buildDimension(
  key: keyof typeof DIMENSION_LABELS,
  score: number,
  trend: Trend,
): AnalyticsDimension {
  const meta = DIMENSION_LABELS[key];
  return {
    score: round(clamp(score)),
    label: meta.label,
    description: meta.description,
    trend,
    signals: [...meta.signals],
  };
}

function computeConsistencyScore(sessions: SessionRecord[]): number {
  const practiceSessions = sessions.filter(isPracticeSession);
  const practiceDates = uniqueSortedDates(practiceSessions);
  const allDates = uniqueSortedDates(sessions);

  if (practiceDates.length === 0) return 0;

  const spanDays =
    allDates.length > 1
      ? (parseDate(allDates[allDates.length - 1]!) - parseDate(allDates[0]!)) /
          (1000 * 60 * 60 * 24) +
        1
      : 1;

  const frequencyScore = clamp((practiceDates.length / spanDays) * 100);
  const streakScore = clamp((longestStreak(practiceDates) / 7) * 100);
  const balanceScore = subjectBalanceScore(practiceSessions);
  const currentStreakScore = clamp((currentStreak(practiceDates) / 7) * 100);

  return (
    frequencyScore * 0.4 +
    streakScore * 0.25 +
    balanceScore * 0.2 +
    currentStreakScore * 0.15
  );
}

function computeAccuracyScore(sessions: SessionRecord[]): number {
  const practiceSessions = sessions.filter(isPracticeSession);
  if (practiceSessions.length === 0) return 0;

  const scored = practiceSessions.filter((s) => s.score !== null);
  const avgSessionScore =
    scored.length > 0
      ? scored.reduce((sum, s) => sum + (s.score ?? 0), 0) / scored.length
      : 0;

  const totalAttempted = practiceSessions.reduce((sum, s) => sum + s.questionsAttempted, 0);
  const totalCorrect = practiceSessions.reduce((sum, s) => sum + s.questionsCorrect, 0);
  const firstAttemptRate =
    totalAttempted > 0 ? (totalCorrect / totalAttempted) * 100 : 0;

  const totalRetries = practiceSessions.reduce((sum, s) => sum + s.retriesOnWrong, 0);
  const errorRepeatRate =
    totalAttempted > 0 ? (totalRetries / totalAttempted) * 100 : 0;
  const retryControlScore = clamp(100 - errorRepeatRate * 2.5);

  return avgSessionScore * 0.55 + firstAttemptRate * 0.25 + retryControlScore * 0.2;
}

function chapterKey(session: SessionRecord): string | null {
  if (!session.subject || !session.chapter) return null;
  return `${session.subject}:${session.chapter}`;
}

function computeRecoveryScore(sessions: SessionRecord[]): number {
  const practiceSessions = sessions.filter(isPracticeSession);
  if (practiceSessions.length === 0) return 0;

  const weakThreshold = 65;
  const weakSessions = practiceSessions.filter((s) => (s.score ?? 0) < weakThreshold);
  const weakKeys = new Set(
    weakSessions.map(chapterKey).filter((key): key is string => key !== null),
  );

  const chapterSessions = new Map<string, SessionRecord[]>();
  practiceSessions.forEach((session) => {
    const key = chapterKey(session);
    if (!key) return;
    const list = chapterSessions.get(key) ?? [];
    list.push(session);
    chapterSessions.set(key, list);
  });

  let revisitHits = 0;
  let unresolvedWeak = 0;
  weakKeys.forEach((key) => {
    const records = chapterSessions.get(key) ?? [];
    if (records.length >= 2) revisitHits += 1;
    const lastScore = records[records.length - 1]?.score ?? 0;
    if (lastScore < weakThreshold) unresolvedWeak += 1;
  });

  const weakChapterRevisitRate =
    weakKeys.size > 0 ? (revisitHits / weakKeys.size) * 100 : 50;

  let gainSamples = 0;
  let gainTotal = 0;
  chapterSessions.forEach((records) => {
    if (records.length < 2) return;
    const sorted = [...records].sort((a, b) => parseDate(a.date) - parseDate(b.date));
    const first = sorted[0]?.score ?? 0;
    const last = sorted[sorted.length - 1]?.score ?? 0;
    gainTotal += last - first;
    gainSamples += 1;
  });
  const masteryGainScore =
    gainSamples > 0 ? clamp(45 + (gainTotal / gainSamples) * 1.5) : 45;

  const recoverySessions = practiceSessions.filter(
    (s) => s.engineType === "recovery" || s.engineType === "concept_review",
  );
  const followThroughRate =
    weakKeys.size > 0
      ? clamp((recoverySessions.length / weakKeys.size) * 80)
      : 45;

  const unresolvedPenalty =
    weakKeys.size > 0 ? (unresolvedWeak / weakKeys.size) * 18 : 0;

  const rawScore =
    weakChapterRevisitRate * 0.3 +
    masteryGainScore * 0.35 +
    followThroughRate * 0.35;

  return clamp(rawScore - unresolvedPenalty);
}

function computeMomentumScore(sessions: SessionRecord[]): number {
  const practiceSessions = [...sessions.filter(isPracticeSession)].sort(
    (a, b) => parseDate(a.date) - parseDate(b.date),
  );
  if (practiceSessions.length === 0) return 0;

  const practiceDates = uniqueSortedDates(practiceSessions);
  const streakScore = clamp((longestStreak(practiceDates) / 7) * 100);

  const scores = practiceSessions
    .map((s) => s.score)
    .filter((score): score is number => score !== null);

  const split = Math.max(1, Math.floor(scores.length / 2));
  const older = scores.slice(0, split);
  const recent = scores.slice(split);
  const olderAvg =
    older.length > 0 ? older.reduce((sum, value) => sum + value, 0) / older.length : 0;
  const recentAvg =
    recent.length > 0 ? recent.reduce((sum, value) => sum + value, 0) / recent.length : 0;
  const trendScore = clamp(50 + (recentAvg - olderAvg) * 2);

  const olderDuration =
    practiceSessions.slice(0, split).reduce((sum, s) => sum + s.durationMinutes, 0) /
    Math.max(1, split);
  const recentDuration =
    practiceSessions.slice(split).reduce((sum, s) => sum + s.durationMinutes, 0) /
    Math.max(1, recent.length);
  const durationScore = clamp(50 + (recentDuration - olderDuration) * 1.5);

  return streakScore * 0.4 + trendScore * 0.35 + durationScore * 0.25;
}

function computeDisciplineScore(sessions: SessionRecord[]): number {
  if (sessions.length === 0) return 0;

  const practiceSessions = sessions.filter(isPracticeSession);
  const skipSessions = sessions.filter(isSkipSession);

  const planFollowRate =
    practiceSessions.length > 0
      ? (practiceSessions.filter((s) => s.completedPlan).length / practiceSessions.length) *
        100
      : 0;

  const sessionCompletionRate =
    sessions.length > 0
      ? (sessions.filter((s) => s.completedPlan).length / sessions.length) * 100
      : 0;

  const allDates = uniqueSortedDates(sessions);
  const spanDays =
    allDates.length > 1
      ? (parseDate(allDates[allDates.length - 1]!) - parseDate(allDates[0]!)) /
          (1000 * 60 * 60 * 24) +
        1
      : 1;
  const skipDayRate = (skipSessions.length / spanDays) * 100;
  const skipControlScore = clamp(100 - skipDayRate * 5);

  return planFollowRate * 0.2 + sessionCompletionRate * 0.2 + skipControlScore * 0.6;
}

function computeConfidenceStabilityScore(sessions: SessionRecord[]): number {
  const practiceSessions = sessions.filter(isPracticeSession);
  if (practiceSessions.length === 0) return 0;

  const scores = practiceSessions
    .map((s) => s.score)
    .filter((score): score is number => score !== null);
  const mean = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  const variance =
    scores.reduce((sum, value) => sum + (value - mean) ** 2, 0) / scores.length;
  const stdDev = Math.sqrt(variance);
  const varianceScore = clamp(100 - stdDev * 3);

  const panicRate =
    (practiceSessions.filter((s) => s.panicSignal).length / practiceSessions.length) * 100;
  const panicScore = clamp(100 - panicRate * 2.2);

  const timedLike = practiceSessions.filter(
    (s) => s.engineType === "timed_test" || s.panicSignal,
  );
  const practiceLike = practiceSessions.filter(
    (s) => s.engineType !== "timed_test" && !s.panicSignal,
  );

  const timedAvg =
    timedLike.length > 0
      ? timedLike.reduce((sum, s) => sum + (s.score ?? 0), 0) / timedLike.length
      : mean;
  const practiceAvg =
    practiceLike.length > 0
      ? practiceLike.reduce((sum, s) => sum + (s.score ?? 0), 0) / practiceLike.length
      : mean;
  const examGap = Math.max(0, practiceAvg - timedAvg);
  const gapScore = clamp(100 - examGap * 2.5);

  const hardProblemScore = clamp(
    100 -
      (practiceSessions.reduce((sum, s) => sum + s.hintsUsed, 0) /
        practiceSessions.length) *
        4,
  );

  return varianceScore * 0.3 + panicScore * 0.3 + gapScore * 0.25 + hardProblemScore * 0.15;
}

function computeOverallHealth(dimensions: AnalyticsState["dimensions"]): number {
  const values = Object.values(dimensions).map((dimension) => dimension.score);
  return round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

/**
 * Compute all six analytics dimensions from raw session history only.
 */
export function computeAnalyticsFromSessions(sessions: SessionRecord[]): AnalyticsResult {
  const practiceSessions = sessions.filter(isPracticeSession);
  const practiceDates = uniqueSortedDates(practiceSessions);
  const scores = practiceSessions
    .map((s) => s.score)
    .filter((score): score is number => score !== null);

  const split = Math.max(1, Math.floor(scores.length / 2));
  const olderAvg =
    scores.slice(0, split).reduce((sum, value) => sum + value, 0) / Math.max(1, split);
  const recentAvg =
    scores.slice(split).reduce((sum, value) => sum + value, 0) /
    Math.max(1, scores.length - split);

  const dimensions = {
    consistency: buildDimension(
      "consistency",
      computeConsistencyScore(sessions),
      scoreTrend(recentAvg, olderAvg),
    ),
    accuracy: buildDimension(
      "accuracy",
      computeAccuracyScore(sessions),
      scoreTrend(recentAvg, olderAvg),
    ),
    recovery: buildDimension(
      "recovery",
      computeRecoveryScore(sessions),
      scoreTrend(recentAvg, olderAvg),
    ),
    momentum: buildDimension(
      "momentum",
      computeMomentumScore(sessions),
      scoreTrend(recentAvg, olderAvg),
    ),
    discipline: buildDimension(
      "discipline",
      computeDisciplineScore(sessions),
      "stable",
    ),
    confidenceStability: buildDimension(
      "confidenceStability",
      computeConfidenceStabilityScore(sessions),
      scoreTrend(recentAvg, olderAvg),
    ),
  };

  return {
    overallHealthScore: computeOverallHealth(dimensions),
    lastUpdated: practiceDates[practiceDates.length - 1] ?? new Date().toISOString().slice(0, 10),
    dimensions,
  };
}

/** Contract alias — dimensions are derived from sessions only. */
export function computeAnalytics(sessions: SessionRecord[]): AnalyticsResult {
  return computeAnalyticsFromSessions(sessions);
}

export function loadSeedSessions(): SessionRecord[] {
  return (seedProfile as { sessionHistory: SessionRecord[] }).sessionHistory;
}

export function runAnalyticsFromSeed(): AnalyticsResult {
  return computeAnalyticsFromSessions(loadSeedSessions());
}

const SEED_EXPECTATIONS = {
  overallHealthScore: 66,
  consistency: 68,
  accuracy: 71,
  recovery: 58,
  momentum: 64,
  discipline: 60,
  confidenceStability: 63,
} as const;

const TOLERANCE = 8;

export type AnalyticsValidationResult = {
  pass: boolean;
  output: AnalyticsResult;
  errors: string[];
};

export function validateAnalyticsSeed(): AnalyticsValidationResult {
  const output = runAnalyticsFromSeed();
  const errors: string[] = [];

  const check = (label: string, actual: number, expected: number) => {
    if (Math.abs(actual - expected) > TOLERANCE) {
      errors.push(`${label}: expected ~${expected}, got ${actual}`);
    }
  };

  check("overallHealthScore", output.overallHealthScore, SEED_EXPECTATIONS.overallHealthScore);
  check("consistency", output.dimensions.consistency.score, SEED_EXPECTATIONS.consistency);
  check("accuracy", output.dimensions.accuracy.score, SEED_EXPECTATIONS.accuracy);
  check("recovery", output.dimensions.recovery.score, SEED_EXPECTATIONS.recovery);
  check("momentum", output.dimensions.momentum.score, SEED_EXPECTATIONS.momentum);
  check("discipline", output.dimensions.discipline.score, SEED_EXPECTATIONS.discipline);
  check(
    "confidenceStability",
    output.dimensions.confidenceStability.score,
    SEED_EXPECTATIONS.confidenceStability,
  );

  return { pass: errors.length === 0, output, errors };
}
