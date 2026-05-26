import type { QuestionAttempt, Subject } from "@/types/question";
import {
  getAttemptsBySubject,
  getAttemptsSince,
  getPressureDelta,
  readAllAttempts,
} from "@/engines/analytics/attemptLogger";
import { getMasteryLabel, readProfile } from "@/engines/analytics/profileUpdater";
import { getBlueprint } from "@/lib/blueprintUtils";

export interface SessionInsight {
  improving: string[];
  needsWork: string[];
}

export function getSessionInsights(
  sessionAttempts: QuestionAttempt[],
  allAttempts: QuestionAttempt[],
): SessionInsight {
  const thisSession: Record<string, QuestionAttempt[]> = {};
  sessionAttempts.forEach((a) => {
    if (!thisSession[a.chapterId]) thisSession[a.chapterId] = [];
    thisSession[a.chapterId].push(a);
  });

  const sessionStart = sessionAttempts[0]?.timestamp ?? Date.now();
  const prevAttempts = allAttempts.filter((a) => a.timestamp < sessionStart);
  const prevByChapter: Record<string, QuestionAttempt[]> = {};
  prevAttempts.forEach((a) => {
    if (!prevByChapter[a.chapterId]) prevByChapter[a.chapterId] = [];
    prevByChapter[a.chapterId].push(a);
  });

  const improving: string[] = [];
  const needsWork: string[] = [];

  Object.entries(thisSession).forEach(([chapterId, attempts]) => {
    if (attempts.length < 2) return;

    const thisAcc = attempts.filter((a) => a.isCorrect).length / attempts.length;
    const prevChapterAttempts = prevByChapter[chapterId] ?? [];
    const prevAcc =
      prevChapterAttempts.length > 0
        ? prevChapterAttempts.filter((a) => a.isCorrect).length /
          prevChapterAttempts.length
        : null;

    const chapterName = attempts[0].chapterId;

    if (thisAcc < 0.5) {
      needsWork.push(chapterName);
    } else if (prevAcc !== null && thisAcc > prevAcc + 0.1) {
      improving.push(chapterName);
    }
  });

  return { improving, needsWork };
}

export interface WeeklyReport {
  subject: Subject;
  weekAccuracy: number | null;
  prevWeekAccuracy: number | null;
  accuracyDelta: number | null;
  avgSpeedMs: number | null;
  pressureDelta: number | null;
  strongestChapter: string | null;
  weakestCriticalChapter: string | null;
  misconceptionCount: number;
  totalAttempts: number;
  insightLine: string;
}

export function buildWeeklyReport(subject: Subject): WeeklyReport | null {
  const now = Date.now();
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;

  const thisWeek = getAttemptsSince(now - oneWeekMs).filter(
    (a) => a.subject === subject,
  );
  const prevWeek = getAttemptsBySubject(subject).filter(
    (a) => a.timestamp >= now - 2 * oneWeekMs && a.timestamp < now - oneWeekMs,
  );

  if (thisWeek.length < 5) return null;

  const weekAccuracy = Math.round(
    (thisWeek.filter((a) => a.isCorrect).length / thisWeek.length) * 100,
  );
  const prevWeekAccuracy =
    prevWeek.length >= 5
      ? Math.round(
          (prevWeek.filter((a) => a.isCorrect).length / prevWeek.length) * 100,
        )
      : null;
  const accuracyDelta =
    prevWeekAccuracy !== null ? weekAccuracy - prevWeekAccuracy : null;

  const times = thisWeek.map((a) => a.timeTakenMs).filter((t) => t > 0);
  const avgSpeedMs =
    times.length > 0
      ? Math.round(times.reduce((s, t) => s + t, 0) / times.length)
      : null;

  const pressureDelta = getPressureDelta(subject);

  const profile = readProfile();
  const bp = getBlueprint(subject);
  let strongestChapter: string | null = null;
  let weakestCriticalChapter: string | null = null;

  if (profile && bp) {
    const masteries = bp.chapters.map((ch) => ({
      name: ch.name,
      mastery: profile.chapterMastery[ch.id] ?? 0,
      priority: ch.priority,
    }));

    const sorted = [...masteries].sort((a, b) => b.mastery - a.mastery);
    strongestChapter = sorted[0]?.name ?? null;

    const criticalWeak = masteries
      .filter((m) => m.priority === "critical")
      .sort((a, b) => a.mastery - b.mastery);
    weakestCriticalChapter = criticalWeak[0]?.name ?? null;
  }

  const misconceptionCount = profile?.misconceptionRisk.length ?? 0;

  const insightLine = buildInsightLine({
    accuracyDelta,
    pressureDelta,
    weekAccuracy,
    weakestCriticalChapter,
    misconceptionCount,
  });

  return {
    subject,
    weekAccuracy,
    prevWeekAccuracy,
    accuracyDelta,
    avgSpeedMs,
    pressureDelta,
    strongestChapter,
    weakestCriticalChapter,
    misconceptionCount,
    totalAttempts: thisWeek.length,
    insightLine,
  };
}

function buildInsightLine(data: {
  accuracyDelta: number | null;
  pressureDelta: number | null;
  weekAccuracy: number | null;
  weakestCriticalChapter: string | null;
  misconceptionCount: number;
}): string {
  const {
    accuracyDelta,
    pressureDelta,
    weekAccuracy,
    weakestCriticalChapter,
    misconceptionCount,
  } = data;

  if (pressureDelta !== null && pressureDelta > 15) {
    return `Your timed accuracy drops ${pressureDelta}% compared to practice. Focus on timed sessions this week.`;
  }

  if (misconceptionCount > 0) {
    return `Aura detected ${misconceptionCount} possible misconception${misconceptionCount > 1 ? "s" : ""}. Review flagged chapters carefully — not just more practice.`;
  }

  if (accuracyDelta !== null && accuracyDelta >= 10) {
    return `Great progress — accuracy up ${accuracyDelta}% from last week. Keep the momentum.`;
  }

  if (accuracyDelta !== null && accuracyDelta <= -10) {
    return `Accuracy dropped ${Math.abs(accuracyDelta)}% this week. Consider shorter, more focused sessions.`;
  }

  if (weakestCriticalChapter && (weekAccuracy ?? 0) < 70) {
    return `${weakestCriticalChapter} carries high board exam marks but needs attention. Prioritise it next week.`;
  }

  return weekAccuracy !== null && weekAccuracy >= 75
    ? `Solid week at ${weekAccuracy}% accuracy. Push for timed practice to lock in your gains.`
    : `Stay consistent — small daily sessions beat long weekend cramming every time.`;
}

export interface ChapterMasterySummary {
  chapterId: string;
  chapterName: string;
  mastery: number;
  label: string;
  delta: number | null;
  daysSinceLastAttempt: number | null;
  totalAttempts: number;
}

export function getChapterMasterySummaries(
  subject: Subject,
): ChapterMasterySummary[] {
  const profile = readProfile();
  const bp = getBlueprint(subject);
  const allAttempts = getAttemptsBySubject(subject);

  if (!bp) return [];

  return bp.chapters.map((ch) => {
    const mastery = profile?.chapterMastery[ch.id] ?? 0;
    const attempts = allAttempts.filter((a) => a.chapterId === ch.id);
    const lastAttempt =
      attempts.length > 0
        ? Math.max(...attempts.map((a) => a.timestamp))
        : null;
    const daysSince = lastAttempt
      ? Math.floor((Date.now() - lastAttempt) / (1000 * 60 * 60 * 24))
      : null;

    return {
      chapterId: ch.id,
      chapterName: ch.name,
      mastery,
      label: getMasteryLabel(attempts.length > 0 ? mastery : undefined),
      delta: null,
      daysSinceLastAttempt: daysSince,
      totalAttempts: attempts.length,
    };
  });
}
