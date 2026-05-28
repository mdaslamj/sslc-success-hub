import { computeSubjectMasteryView } from "@/core/academic-state/masteryEngine";
import { computeProbabilitySnapshot } from "@/core/academic-state/probabilityEngine";
import { computeBurnoutSnapshot } from "@/core/academic-state/burnoutEngine";
import { buildConstellationView } from "@/core/academic-state/constellationView";
import type {
  AnalyticsState,
  AuraEngineOutputs,
  SessionRecord,
  StudentLearningProfile,
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

export type AcademicAnalyticsView = {
  readiness: number;
  targetScore: number;
  gap: number;
  probability: number;
  overallHealth: number;
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

/** Running session-score trend ending at current engine readiness. */
function buildTrajectorySeries(
  sessions: SessionRecord[],
  currentReadiness: number,
): AnalyticsTrajectoryPoint[] {
  const sorted = [...sessions].sort(
    (a, b) => parseDate(a.date) - parseDate(b.date),
  );

  const byDate = new Map<string, number[]>();
  for (const session of sorted) {
    if (session.score == null) continue;
    const list = byDate.get(session.date) ?? [];
    list.push(session.score);
    byDate.set(session.date, list);
  }

  const dates = [...byDate.keys()].sort((a, b) => parseDate(a) - parseDate(b));
  const points: AnalyticsTrajectoryPoint[] = [];
  const allScores: number[] = [];

  for (const date of dates) {
    for (const score of byDate.get(date) ?? []) {
      allScores.push(score);
    }
    const running =
      allScores.length > 0
        ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
        : 0;
    points.push({ date, label: formatDayLabel(date), score: running });
  }

  if (points.length === 0) {
    return [{ date: "today", label: "Now", score: currentReadiness }];
  }

  const last = points[points.length - 1]!;
  if (last.score !== currentReadiness) {
    points.push({ date: "now", label: "Now", score: currentReadiness });
  }

  return points.slice(-12);
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
  "projection" | "target" | "momentum" | "burnout" | "analytics"
>;

/**
 * Read-only analytics projection over the single academic-state graph.
 * Does not persist or mutate profile data.
 */
export function buildAcademicAnalyticsView(
  profile: StudentLearningProfile,
  engines: EngineSlice,
): AcademicAnalyticsView {
  const { projection, target, momentum, burnout, analytics } = engines;
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

  return {
    readiness,
    targetScore,
    gap,
    probability,
    overallHealth: analytics.overallHealthScore,
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
    trajectory: buildTrajectorySeries(profile.sessionHistory, readiness),
  };
}
