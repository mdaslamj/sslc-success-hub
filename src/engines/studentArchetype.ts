import type {
  Archetype,
  ArchetypeOutput,
  BehavioralSignals,
  ScoreProjectionOutput,
  SessionRecord,
  Trend,
} from "@/types/aura-engine-contracts";

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function scoreTrend(recentAvg: number, olderAvg: number): Trend {
  const delta = recentAvg - olderAvg;
  if (delta >= 3) return "improving";
  if (delta <= -3) return "declining";
  return "stable";
}

function deriveRecoverySpeed(sessions: SessionRecord[]): BehavioralSignals["recoverySpeed"] {
  const practice = sessions.filter(
    (session) => session.questionsAttempted > 0 && session.subject && session.chapter,
  );
  const byChapter = new Map<string, SessionRecord[]>();

  practice.forEach((session) => {
    const key = `${session.subject}:${session.chapter}`;
    const list = byChapter.get(key) ?? [];
    list.push(session);
    byChapter.set(key, list);
  });

  let revisits = 0;
  let improvements = 0;

  byChapter.forEach((records) => {
    if (records.length < 2) return;
    revisits += 1;
    const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
    const first = sorted[0]?.score ?? 0;
    const last = sorted.at(-1)?.score ?? 0;
    if (last > first + 3) improvements += 1;
  });

  if (revisits === 0) return "moderate";
  const rate = improvements / revisits;
  if (rate >= 0.66) return "fast";
  if (rate >= 0.33) return "moderate";
  return "slow";
}

function deriveBehavioralSignals(
  sessions: SessionRecord[],
  projection: ScoreProjectionOutput,
): BehavioralSignals {
  const practice = sessions.filter((session) => session.questionsAttempted > 0);
  const scored = practice.filter((session) => session.score !== null);
  const recent = scored.slice(-5);
  const older = scored.slice(-10, -5);
  const recentAvg =
    recent.length > 0
      ? recent.reduce((sum, session) => sum + (session.score ?? 0), 0) / recent.length
      : 0;
  const olderAvg =
    older.length > 0
      ? older.reduce((sum, session) => sum + (session.score ?? 0), 0) / older.length
      : recentAvg;

  const examSessions = practice.filter((session) => session.engineType === "timed_test");
  const examAvg =
    examSessions.length > 0
      ? examSessions.reduce((sum, session) => sum + (session.score ?? 0), 0) / examSessions.length
      : recentAvg;

  const completionRate =
    practice.length > 0
      ? (practice.filter((session) => session.completedPlan).length / practice.length) * 100
      : 0;
  const panicIndex =
    practice.length > 0
      ? round1(
          (practice.filter((session) => session.panicSignal).length / practice.length) * 100,
        )
      : 0;

  const uniqueDates = [...new Set(practice.map((session) => session.date))];
  const streakDiscipline = clamp((uniqueDates.length / Math.max(1, practice.length)) * 100, 0, 100);

  return {
    overallMastery: round1(projection.percentage),
    sessionCompletionRate: round1(completionRate),
    accuracyTrend: scoreTrend(recentAvg, olderAvg),
    recoverySpeed: deriveRecoverySpeed(sessions),
    streakDiscipline: round1(streakDiscipline),
    panicIndex,
    helpSeekingFrequency: round1(
      practice.length > 0
        ? practice.reduce((sum, session) => sum + session.hintsUsed, 0) / practice.length
        : 0,
    ),
    retryBehavior: round1(
      practice.length > 0
        ? practice.reduce((sum, session) => sum + session.retriesOnWrong, 0) / practice.length
        : 0,
    ),
    examPerformanceVsPractice: round1(recentAvg - examAvg),
    timeOnHardProblems: round1(clamp(recentAvg * 0.65 + completionRate * 0.35, 0, 100)),
  };
}

function bandFromScore(score: number, projectionPct: number): Archetype {
  if (projectionPct >= 85 || score >= 75) return "topper";
  if (projectionPct < 60 || score < 45) return "struggling";
  return "average";
}

function dashboardToneFor(band: Archetype): string {
  if (band === "struggling") return "You can still pass strongly.";
  if (band === "topper") return "You are within reach of state rank.";
  return "You are capable of 85+.";
}

function layoutDensityFor(band: Archetype): ArchetypeOutput["layoutDensity"] {
  if (band === "struggling") return "simple";
  if (band === "topper") return "advanced";
  return "standard";
}

function messagingKeyFor(band: Archetype): ArchetypeOutput["messagingKey"] {
  if (band === "struggling") return "recovery";
  if (band === "topper") return "precision";
  return "optimization";
}

function showMetricsFor(band: Archetype): string[] {
  if (band === "struggling") {
    return ["recoveryPath", "easiestWins", "dailyStreak"];
  }
  if (band === "topper") {
    return ["precisionGap", "rankProjection", "efficiencyScore"];
  }
  return ["subjectBalance", "weakAreas", "targetGap"];
}

function compositeScore(signals: BehavioralSignals): number {
  return Math.round(
    clamp(
      signals.overallMastery * 0.45 +
        signals.sessionCompletionRate * 0.2 +
        signals.streakDiscipline * 0.15 +
        (100 - signals.panicIndex) * 0.1 +
        (signals.accuracyTrend === "improving" ? 10 : signals.accuracyTrend === "declining" ? -5 : 0),
      0,
      100,
    ),
  );
}

export function studentArchetypeEngine(
  sessions: SessionRecord[],
  projection: ScoreProjectionOutput,
): ArchetypeOutput {
  const signals = deriveBehavioralSignals(sessions, projection);
  const score = compositeScore(signals);
  const archetype = bandFromScore(score, projection.percentage);
  const today = new Date().toISOString().slice(0, 10);

  return {
    archetype,
    score,
    signals,
    dashboardTone: dashboardToneFor(archetype),
    messagingKey: messagingKeyFor(archetype),
    layoutDensity: layoutDensityFor(archetype),
    showMetrics: showMetricsFor(archetype),
    history: [{ date: today, band: archetype, score }],
  };
}
