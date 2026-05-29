import type {
  ScoreProjectionOutput,
  SessionRecord,
  StudentLearningProfile,
  Subject,
  TrajectoryOutput,
} from "@/types/aura-engine-contracts";

const SUBJECTS: Subject[] = ["math", "science", "social"];
const MASTERY_TO_SCORE = 0.85;
const MASTERY_CAP = 95;
const FAIL_THRESHOLD = 35;
const TREND_THRESHOLD = 5;

/** Short-term shift from today's planner execution (kept for execution panel). */
export function computeTrajectoryShift(
  readinessDelta: number,
  completedCount: number,
): number {
  if (completedCount === 0) return 0;
  return Math.round((readinessDelta + completedCount * 0.08) * 10) / 10;
}

function parseDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T12:00:00Z`);
}

function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function masteryToScore(mastery: number): number {
  return Math.round(clamp(mastery, 0, MASTERY_CAP) * MASTERY_TO_SCORE);
}

function sessionsInWindow(
  sessions: SessionRecord[],
  start: Date,
  end: Date,
): SessionRecord[] {
  return sessions.filter((session) => {
    const date = parseDateKey(session.date);
    return date >= start && date <= end;
  });
}

function averageSessionScore(sessions: SessionRecord[], subject?: Subject): number | null {
  const filtered = sessions.filter(
    (session) =>
      session.score != null && (subject ? session.subject === subject : true),
  );
  if (filtered.length === 0) return null;
  const total = filtered.reduce((sum, session) => sum + (session.score ?? 0), 0);
  return total / filtered.length;
}

function computeLearningVelocity(sessions: SessionRecord[], today: Date): number {
  const sevenDaysAgo = addDays(today, -7);
  const recent = sessionsInWindow(sessions, sevenDaysAgo, today);
  return recent.length / 7;
}

function computeMasteryRatePerDay(
  sessions: SessionRecord[],
  projection: ScoreProjectionOutput,
  today: Date,
): number {
  const fourteenDaysAgo = addDays(today, -14);
  const twentyEightDaysAgo = addDays(today, -28);
  const recent = sessionsInWindow(sessions, fourteenDaysAgo, today);
  const prior = sessionsInWindow(sessions, twentyEightDaysAgo, fourteenDaysAgo);

  const rates: number[] = [];

  for (const subject of SUBJECTS) {
    const currentMastery = projection.bySubject[subject].percentage;
    const recentAvg = averageSessionScore(recent, subject);
    const priorAvg = averageSessionScore(prior, subject);

    if (recentAvg != null && priorAvg != null) {
      rates.push((recentAvg - priorAvg) / 14);
      continue;
    }

    if (recentAvg != null) {
      rates.push((recentAvg - currentMastery) / 14);
      continue;
    }

    rates.push((currentMastery - Math.max(0, currentMastery - 3)) / 14);
  }

  if (rates.length === 0) return 0;
  return rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
}

function confidenceFromSessions(sessionCount: number): TrajectoryOutput["confidenceLevel"] {
  if (sessionCount >= 20) return "high";
  if (sessionCount >= 5) return "medium";
  return "low";
}

function resolveTrend(
  currentScore: number,
  examDayScore: number,
): TrajectoryOutput["trend"] {
  if (examDayScore < FAIL_THRESHOLD) return "at_risk";
  const delta = examDayScore - currentScore;
  if (delta >= TREND_THRESHOLD) return "improving";
  if (delta <= -TREND_THRESHOLD) return "declining";
  return "stable";
}

function buildMessage(
  trend: TrajectoryOutput["trend"],
  examDayScore: number,
  targetScore: number,
  daysUntilExam: number,
  recoverableMarks: number,
): string {
  const aboveTarget = Math.max(0, Math.round(examDayScore - targetScore));

  switch (trend) {
    case "improving":
      return `At this pace you will reach ${examDayScore}% by exam day — ${aboveTarget} marks above your target.`;
    case "declining":
      return `Your study pace has slowed. Adding one session per day recovers ${Math.max(1, recoverableMarks)} marks.`;
    case "at_risk":
      return "Your current trajectory puts you below the pass mark. Daily study is critical.";
    default:
      return daysUntilExam <= 14
        ? `Holding steady at ${examDayScore}% with ${daysUntilExam} days left — small daily gains still help.`
        : `On track for ${examDayScore}% if you maintain your current study rhythm.`;
  }
}

function buildWeeklyPoints(
  currentMastery: number,
  masteryRate: number,
  daysUntilExam: number,
  today: Date,
): TrajectoryOutput["weeklyPoints"] {
  const weekSlots = Math.min(7, Math.max(1, Math.ceil(daysUntilExam / 7)));
  const points: TrajectoryOutput["weeklyPoints"] = [];

  for (let week = 0; week <= weekSlots; week += 1) {
    const dayOffset = Math.min(week * 7, daysUntilExam);
    const projectedMastery = clamp(
      currentMastery + masteryRate * dayOffset,
      0,
      MASTERY_CAP,
    );
    points.push({
      week,
      date: formatDateKey(addDays(today, dayOffset)),
      score: masteryToScore(projectedMastery),
    });
  }

  return points;
}

function computeSessionsNeededPerDay(
  examDayScore: number,
  targetScore: number,
  daysUntilExam: number,
  velocity: number,
): number {
  if (daysUntilExam <= 0) return 0;
  const gap = Math.max(0, targetScore - examDayScore);
  if (gap <= 0) return Math.max(0, Math.round((1 - velocity) * 10) / 10);
  const baseNeed = gap / (daysUntilExam * 2.5);
  return Math.round(Math.max(0.5, baseNeed) * 10) / 10;
}

export function trajectoryEngine(
  profile: StudentLearningProfile,
  projection: ScoreProjectionOutput,
): TrajectoryOutput {
  const today = new Date();
  const sessions = (profile.sessionHistory ?? []).slice(-30);
  const daysUntilExam = Math.max(0, profile.student.daysToExam ?? 0);
  const targetScore = profile.student.targetScore ?? 70;

  const currentMastery = projection.percentage;
  const currentScore = Math.round(currentMastery);

  const velocity = computeLearningVelocity(sessions, today);
  let masteryRate = computeMasteryRatePerDay(sessions, projection, today);

  if (velocity === 0 && masteryRate > 0) {
    masteryRate *= 0.5;
  } else if (velocity === 0) {
    masteryRate = -0.05;
  } else if (velocity >= 1) {
    masteryRate = Math.max(masteryRate, 0.15);
  }

  const projectedMasteryAtExam = clamp(
    currentMastery + masteryRate * daysUntilExam,
    0,
    MASTERY_CAP,
  );
  const examDayScore = masteryToScore(projectedMasteryAtExam);
  const projectedScore = examDayScore;
  const trend = resolveTrend(currentScore, examDayScore);
  const weeklyPoints = buildWeeklyPoints(
    currentMastery,
    masteryRate,
    daysUntilExam,
    today,
  );
  const sessionsNeededPerDay = computeSessionsNeededPerDay(
    examDayScore,
    targetScore,
    daysUntilExam,
    velocity,
  );
  const recoverableMarks = Math.round(
    Math.min(daysUntilExam, 14) * Math.max(masteryRate, 0.2) * MASTERY_TO_SCORE,
  );

  return {
    currentScore,
    projectedScore,
    examDayScore,
    trend,
    weeklyPoints,
    daysUntilExam,
    sessionsNeededPerDay,
    confidenceLevel: confidenceFromSessions(profile.sessionHistory?.length ?? 0),
    message: buildMessage(
      trend,
      examDayScore,
      targetScore,
      daysUntilExam,
      recoverableMarks,
    ),
  };
}
