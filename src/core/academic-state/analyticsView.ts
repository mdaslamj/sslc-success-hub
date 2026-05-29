import { computeSubjectMasteryView } from "@/core/academic-state/masteryEngine";
import { computeProbabilitySnapshot } from "@/core/academic-state/probabilityEngine";
import { computeBurnoutSnapshot } from "@/core/academic-state/burnoutEngine";
import { buildConstellationView } from "@/core/academic-state/constellationView";
import type {
  AnalyticsState,
  AuraEngineOutputs,
  SessionRecord,
  StudentLearningProfile,
  TrajectoryOutput,
} from "@/types/aura-engine-contracts";

export type AnalyticsSubjectRow = {
  id: string;
  name: string;
  color: string;
  mastery: number;
  predicted: number;
  target: number;
  probability: number;
};

export type AnalyticsDimensionRow = {
  key: string;
  label: string;
  score: number;
  trend: string;
  description: string;
};

export type AnalyticsActivityDay = {
  date: string;
  label: string;
  minutes: number;
  avgScore: number | null;
};

export type AnalyticsTrajectoryPoint = {
  date: string;
  label: string;
  score: number;
};

export type AnalyticsReadinessPoint = {
  day: string;
  readiness: number;
};

export type AnalyticsGapRow = {
  subjectId: string;
  subject: string;
  gap: number;
  recovered: number;
  color: string;
};

export type AnalyticsHeatmapCell = {
  week: string;
  day: string;
  dayIndex: number;
  intensity: 0 | 1 | 2 | 3;
  sessions: number;
};

export type AnalyticsWeeklySummaryRow = {
  week: string;
  sessions: number;
  marksRecovered: number;
  probGain: number;
  bestSubject: string;
};

export type AcademicAnalyticsView = {
  readiness: number;
  targetScore: number;
  gap: number;
  probability: number;
  overallHealth: number;
  chaptersDone: number;
  totalChapters: number;
  overallProgress: number;
  momentum: {
    score: number;
    streak: number;
    badge: string;
    trend: string;
  };
  burnout: {
    score: number;
    risk: string;
    recommendation: string;
  };
  subjects: AnalyticsSubjectRow[];
  dimensions: AnalyticsDimensionRow[];
  sessionActivity: AnalyticsActivityDay[];
  trajectory: AnalyticsTrajectoryPoint[];
  readinessHistory: AnalyticsReadinessPoint[];
  gapData: AnalyticsGapRow[];
  sessionHeatmap: AnalyticsHeatmapCell[];
  weeklySummary: AnalyticsWeeklySummaryRow[];
};

const DIMENSION_ORDER = [
  "consistency",
  "accuracy",
  "recovery",
  "momentum",
  "discipline",
  "confidenceStability",
] as const;

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const INITIAL_GAPS_KEY = "aura_analytics_initial_gaps_v1";

function isoWeekKey(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function resolveInitialGaps(current: Record<string, number>): Record<string, number> {
  if (typeof window === "undefined") return current;
  try {
    const raw = window.sessionStorage.getItem(INITIAL_GAPS_KEY);
    if (raw) return JSON.parse(raw) as Record<string, number>;
    window.sessionStorage.setItem(INITIAL_GAPS_KEY, JSON.stringify(current));
    return current;
  } catch {
    return current;
  }
}

function buildReadinessHistory(
  sessions: SessionRecord[],
  overallProgress: number,
): AnalyticsReadinessPoint[] {
  const byDate = new Map<string, SessionRecord[]>();
  for (const session of sessions) {
    const list = byDate.get(session.date) ?? [];
    list.push(session);
    byDate.set(session.date, list);
  }

  const dates = [...byDate.keys()].sort((a, b) => parseDate(a) - parseDate(b)).slice(-14);

  if (dates.length === 0) {
    return [{ day: "Now", readiness: overallProgress }];
  }

  // TODO: store readinessAfter on each appendSession call for per-session deltas.
  return dates.map((date) => ({
    day: formatDayLabel(date),
    readiness: overallProgress,
  }));
}

function buildGapData(
  constellation: ReturnType<typeof buildConstellationView>,
  targetBySubject: Record<string, { gap: number }> | undefined,
): AnalyticsGapRow[] {
  const currentGaps = Object.fromEntries(
    Object.entries(constellation.subjects).map(([id, subject]) => [
      id,
      targetBySubject?.[id]?.gap ?? Math.max(0, subject.target - subject.predicted),
    ]),
  );
  const initialGaps = resolveInitialGaps(currentGaps);

  return Object.entries(constellation.subjects).map(([id, subject]) => {
    const gap = currentGaps[id] ?? 0;
    const initial = initialGaps[id] ?? gap;
    return {
      subjectId: id,
      subject: subject.name,
      gap,
      recovered: Math.max(0, initial - gap),
      color: subject.color,
    };
  });
}

function buildSessionHeatmap(sessions: SessionRecord[]): AnalyticsHeatmapCell[] {
  const byWeekDay = new Map<string, number>();
  for (const session of sessions) {
    const week = isoWeekKey(session.date);
    const dayIndex = new Date(`${session.date}T12:00:00Z`).getUTCDay();
    const key = `${week}:${dayIndex}`;
    byWeekDay.set(key, (byWeekDay.get(key) ?? 0) + 1);
  }

  const weeks = [...new Set(sessions.map((session) => isoWeekKey(session.date)))]
    .sort()
    .slice(-6);

  if (weeks.length === 0) {
    return DAY_LABELS.map((day, dayIndex) => ({
      week: "—",
      day,
      dayIndex,
      intensity: 0,
      sessions: 0,
    }));
  }

  const cells: AnalyticsHeatmapCell[] = [];
  for (const week of weeks) {
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const count = byWeekDay.get(`${week}:${dayIndex}`) ?? 0;
      const intensity = count >= 3 ? 3 : count === 2 ? 2 : count === 1 ? 1 : 0;
      cells.push({
        week,
        day: DAY_LABELS[dayIndex] ?? "Day",
        dayIndex,
        intensity,
        sessions: count,
      });
    }
  }
  return cells;
}

function buildWeeklySummary(
  sessions: SessionRecord[],
): AnalyticsWeeklySummaryRow[] {
  const byWeek = new Map<
    string,
    { sessions: SessionRecord[]; subjectCounts: Map<string, number> }
  >();

  for (const session of sessions) {
    const week = isoWeekKey(session.date);
    const entry = byWeek.get(week) ?? {
      sessions: [] as SessionRecord[],
      subjectCounts: new Map<string, number>(),
    };
    entry.sessions.push(session);
    if (session.subject) {
      entry.subjectCounts.set(
        session.subject,
        (entry.subjectCounts.get(session.subject) ?? 0) + 1,
      );
    }
    byWeek.set(week, entry);
  }

  return [...byWeek.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([week, entry]) => {
      let bestSubject = "—";
      let bestCount = 0;
      for (const [subject, count] of entry.subjectCounts.entries()) {
        if (count > bestCount) {
          bestCount = count;
          bestSubject = subject;
        }
      }

      const marksRecovered = entry.sessions.reduce(
        (sum, session) => sum + Math.round((session.score ?? 0) / 10),
        0,
      );
      const probGain = entry.sessions.reduce(
        (sum, session) => sum + (session.score ?? 0) / 100,
        0,
      );

      return {
        week,
        sessions: entry.sessions.length,
        marksRecovered,
        probGain: Math.round(probGain * 10) / 10,
        bestSubject,
      };
    });
}

function parseDate(value: string): number {
  return new Date(`${value}T00:00:00Z`).getTime();
}

function formatDayLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00Z`);
  return DAY_LABELS[d.getUTCDay()] ?? dateKey.slice(5);
}

function buildLast14Days(
  sessions: SessionRecord[],
  today = new Date(),
): AnalyticsActivityDay[] {
  const byDay = new Map<string, { minutes: number; scores: number[] }>();

  for (const session of sessions) {
    const entry = byDay.get(session.date) ?? { minutes: 0, scores: [] };
    entry.minutes += session.durationMinutes ?? 0;
    if (session.score != null) entry.scores.push(session.score);
    byDay.set(session.date, entry);
  }

  const out: AnalyticsActivityDay[] = [];
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const date = d.toISOString().slice(0, 10);
    const entry = byDay.get(date);
    const avgScore =
      entry && entry.scores.length
        ? Math.round(entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length)
        : null;
    out.push({
      date,
      label: formatDayLabel(date),
      minutes: entry?.minutes ?? 0,
      avgScore,
    });
  }

  return out;
}

function buildDimensions(analytics: AnalyticsState): AnalyticsDimensionRow[] {
  return DIMENSION_ORDER.map((key) => {
    const dim = analytics.dimensions[key];
    return {
      key,
      label: dim.label,
      score: dim.score,
      trend: dim.trend,
      description: dim.description,
    };
  });
}

type EngineSlice = Pick<
  AuraEngineOutputs,
  "projection" | "target" | "momentum" | "burnout" | "analytics" | "trajectory"
>;

/** Forward-looking weekly score projection for the readiness chart. */
function mapTrajectoryToChart(trajectory: TrajectoryOutput): AnalyticsTrajectoryPoint[] {
  return trajectory.weeklyPoints.map((point) => ({
    date: point.date,
    label: point.week === 0 ? "Now" : point.week === trajectory.weeklyPoints.length - 1 ? "Exam" : `W${point.week}`,
    score: point.score,
  }));
}

/**
 * Read-only analytics projection over the single academic-state graph.
 * Does not persist or mutate profile data.
 */
export function buildAcademicAnalyticsView(
  profile: StudentLearningProfile,
  engines: EngineSlice,
): AcademicAnalyticsView {
  const { projection, target, momentum, burnout, analytics, trajectory } = engines;
  const readiness = Math.round(projection.percentage);
  const targetScore = profile.student.targetScore;
  const gap = Math.max(0, Math.round(target.gap));
  const constellation = buildConstellationView(profile, projection);
  const masteryView = computeSubjectMasteryView(
    profile.chapterMastery,
    projection,
  );

  const subjects: AnalyticsSubjectRow[] = Object.entries(constellation.subjects).map(
    ([id, subject]) => ({
      id,
      name: subject.name,
      color: subject.color,
      mastery: subject.mastery,
      predicted: subject.predicted,
      target: subject.target,
      probability: computeProbabilitySnapshot(
        subject.target,
        subject.predicted,
        subject.mastery,
      ),
    }),
  );

  const overallMastery = masteryView.overall;
  const probability = computeProbabilitySnapshot(
    targetScore,
    readiness,
    overallMastery,
  );
  const burnoutSnap = computeBurnoutSnapshot(burnout);
  const chaptersDone = constellation.chapters.filter((chapter) => chapter.mastery >= 70).length;
  const totalChapters = constellation.chapters.length;
  const overallProgress = readiness;

  return {
    readiness,
    targetScore,
    gap,
    probability,
    overallHealth: analytics.overallHealthScore,
    chaptersDone,
    totalChapters,
    overallProgress,
    momentum: {
      score: Math.round(momentum.score),
      streak: momentum.streak,
      badge: momentum.badge,
      trend: momentum.trend,
    },
    burnout: burnoutSnap,
    subjects,
    dimensions: buildDimensions(analytics),
    sessionActivity: buildLast14Days(profile.sessionHistory),
    trajectory: mapTrajectoryToChart(trajectory),
    readinessHistory: buildReadinessHistory(profile.sessionHistory, readiness),
    gapData: buildGapData(constellation, target.bySubject),
    sessionHeatmap: buildSessionHeatmap(profile.sessionHistory),
    weeklySummary: buildWeeklySummary(profile.sessionHistory),
  };
}
