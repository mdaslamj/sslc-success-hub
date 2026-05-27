import type {
  MomentumOutput,
  SessionRecord,
  Trend,
} from "@/types/aura-engine-contracts";

function parseDate(value: string): number {
  return new Date(`${value}T00:00:00Z`).getTime();
}

function uniqueSortedDates(sessions: SessionRecord[]): string[] {
  return [...new Set(sessions.map((session) => session.date))].sort(
    (a, b) => parseDate(a) - parseDate(b),
  );
}

function currentStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  let streak = 1;
  for (let i = dates.length - 1; i > 0; i -= 1) {
    const dayGap = (parseDate(dates[i]!) - parseDate(dates[i - 1]!)) / (1000 * 60 * 60 * 24);
    if (dayGap === 1) streak += 1;
    else break;
  }

  return streak;
}

function scoreTrend(recentAvg: number, olderAvg: number): Trend {
  const delta = recentAvg - olderAvg;
  if (delta >= 3) return "improving";
  if (delta <= -3) return "declining";
  return "stable";
}

function badgeForScore(score: number): string {
  if (score >= 80) return "🔥 On Fire";
  if (score >= 60) return "⚡ Momentum";
  if (score >= 40) return "✓ Building";
  return "🌱 Starting";
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

export function momentumEngine(sessions: SessionRecord[]): MomentumOutput {
  const practice = sessions.filter((session) => session.questionsAttempted > 0);
  const practiceDates = uniqueSortedDates(practice);
  const streak = currentStreak(practiceDates);

  const scored = practice.filter((session) => session.score !== null);
  const recent = scored.slice(-3);
  const older = scored.slice(-6, -3);
  const recentAvgScore =
    recent.length > 0
      ? recent.reduce((sum, session) => sum + (session.score ?? 0), 0) / recent.length
      : 0;
  const olderAvgScore =
    older.length > 0
      ? older.reduce((sum, session) => sum + (session.score ?? 0), 0) / older.length
      : recentAvgScore;
  const trend = scoreTrend(recentAvgScore, olderAvgScore);

  const totalStudyMinutes = practice.reduce(
    (sum, session) => sum + session.durationMinutes,
    0,
  );
  const completionRate =
    practice.length > 0
      ? practice.filter((session) => session.completedPlan).length / practice.length
      : 0;
  const score = Math.round(
    clamp(streak * 12 + recentAvgScore * 0.55 + completionRate * 25),
  );

  const lastDate = practiceDates.at(-1) ?? new Date().toISOString().slice(0, 10);
  const weeklyPattern: MomentumOutput["weeklyPattern"] = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(`${lastDate}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() - offset);
    const iso = date.toISOString().slice(0, 10);
    const daySessions = practice.filter((session) => session.date === iso);
    const studyMinutes = daySessions.reduce(
      (sum, session) => sum + session.durationMinutes,
      0,
    );
    const dayScored = daySessions.filter((session) => session.score !== null);
    const avgScore =
      dayScored.length > 0
        ? dayScored.reduce((sum, session) => sum + (session.score ?? 0), 0) / dayScored.length
        : 0;

    weeklyPattern.push({ date: iso, studyMinutes, avgScore: Math.round(avgScore) });
  }

  return {
    streak,
    trend,
    score,
    recentAvgScore: Math.round(recentAvgScore),
    totalStudyMinutes,
    badge: badgeForScore(score),
    weeklyPattern,
    computedAt: new Date().toISOString(),
  };
}
