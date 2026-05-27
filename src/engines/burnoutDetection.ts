import type {
  AnalyticsState,
  BurnoutOutput,
  MomentumOutput,
  SessionRecord,
} from "@/types/aura-engine-contracts";

function parseDate(value: string): number {
  return new Date(`${value}T00:00:00Z`).getTime();
}

function addDaysIso(baseDate: string, days: number): string {
  const date = new Date(`${baseDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function practiceSessions(sessions: SessionRecord[]): SessionRecord[] {
  return sessions.filter((session) => session.questionsAttempted > 0);
}

function hasDecliningTrendForSessions(scored: SessionRecord[], count: number): boolean {
  if (scored.length < count) return false;
  const recent = scored.slice(-count);
  for (let i = 1; i < recent.length; i += 1) {
    const prev = recent[i - 1]!.score ?? 0;
    const next = recent[i]!.score ?? 0;
    if (next >= prev) return false;
  }
  return true;
}

function maxConsecutiveSkipDays(sessions: SessionRecord[]): number {
  const dates = [...new Set(sessions.map((session) => session.date))].sort(
    (a, b) => parseDate(a) - parseDate(b),
  );

  let longest = 0;
  let current = 0;

  dates.forEach((date) => {
    const daySessions = sessions.filter((session) => session.date === date);
    const allSkipped = daySessions.length > 0 && daySessions.every((s) => s.durationMinutes === 0);
    if (allSkipped) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  });

  return longest;
}

function averageDurationMinutes(sessions: SessionRecord[], fromDate: string, toDate: string): number {
  const from = parseDate(fromDate);
  const to = parseDate(toDate);
  const inRange = sessions.filter((session) => {
    const time = parseDate(session.date);
    return time >= from && time <= to && session.questionsAttempted > 0;
  });

  if (inRange.length === 0) return 0;
  return inRange.reduce((sum, session) => sum + session.durationMinutes, 0) / inRange.length;
}

function isMomentumDownForSessions(momentum: MomentumOutput, sessions: SessionRecord[]): boolean {
  const trendDown = momentum.trend === "declining" || (momentum.trend as string) === "down";
  if (!trendDown) return false;
  return hasDecliningTrendForSessions(
    practiceSessions(sessions).filter((session) => session.score !== null),
    3,
  );
}

function riskBand(score: number): BurnoutOutput["risk"] {
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  return "low";
}

function recommendationFor(risk: BurnoutOutput["risk"]): string {
  if (risk === "high") {
    return "Your study pattern shows strong burnout signals, so ease intensity before accuracy drops further.";
  }
  if (risk === "medium") {
    return "Some burnout signals are building, so protect consistency with shorter, calmer sessions.";
  }
  return "Your study load looks sustainable right now, so keep the current rhythm.";
}

function recoveryActionFor(risk: BurnoutOutput["risk"], signals: string[]): string {
  if (risk === "high") return "Take a 1-day break";
  if (signals.some((signal) => signal.includes("duration"))) return "Shorten sessions to 20min";
  if (risk === "medium") return "Switch to easier chapters";
  return "Shorten sessions to 20min";
}

export function burnoutDetectionEngine(
  analytics: AnalyticsState,
  sessions: SessionRecord[],
  momentum: MomentumOutput,
): BurnoutOutput {
  const activeSignals: string[] = [];
  let score = 0;

  if (analytics.dimensions.confidenceStability.score < 45) {
    score += 25;
    activeSignals.push("Low confidence stability score");
  }

  if (isMomentumDownForSessions(momentum, sessions)) {
    score += 20;
    activeSignals.push("Momentum trending down for 3+ consecutive sessions");
  }

  const scoredPractice = practiceSessions(sessions).filter((session) => session.score !== null);
  if (hasDecliningTrendForSessions(scoredPractice, 5)) {
    score += 20;
    activeSignals.push("Accuracy declining across last 5 sessions");
  }

  if (maxConsecutiveSkipDays(sessions) >= 2) {
    score += 15;
    activeSignals.push("Two or more consecutive zero-duration days");
  }

  const referenceDate =
    sessions
      .map((session) => session.date)
      .sort((a, b) => parseDate(b) - parseDate(a))[0] ?? new Date().toISOString().slice(0, 10);
  const recentStart = addDaysIso(referenceDate, -6);
  const previousStart = addDaysIso(referenceDate, -13);
  const previousEnd = addDaysIso(referenceDate, -7);
  const recentAvg = averageDurationMinutes(sessions, recentStart, referenceDate);
  const previousAvg = averageDurationMinutes(sessions, previousStart, previousEnd);

  if (previousAvg > 0 && recentAvg < previousAvg * 0.7) {
    score += 15;
    activeSignals.push("Average session duration dropped more than 30% in the last 7 days");
  }

  if (analytics.dimensions.discipline.score < 40) {
    score += 10;
    activeSignals.push("Low discipline score");
  }

  const cappedScore = Math.min(100, score);
  const risk = riskBand(cappedScore);

  return {
    risk,
    score: cappedScore,
    activeSignals,
    recommendation: recommendationFor(risk),
    recoveryAction: recoveryActionFor(risk, activeSignals),
  };
}
