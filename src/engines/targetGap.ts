import type {
  BlueprintEntry,
  ROIChapter,
  ScoreProjectionOutput,
  SessionRecord,
  StudentLearningProfile,
  Subject,
  TargetGapOutput,
} from "@/types/aura-engine-contracts";

import seedProfile from "@/data/StudentLearningProfile.json";
import {
  loadSeedBlueprint,
  runScoreProjectionFromSeed,
  scoreProjectionEngine,
} from "@/engines/scoreProjection";

export type TargetGapResult = TargetGapOutput;

const SUBJECTS: Subject[] = ["math", "science", "social"];

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseDate(value: string): number {
  return new Date(`${value}T00:00:00Z`).getTime();
}

function addDaysIso(baseDate: string, days: number): string {
  const date = new Date(`${baseDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function iterateBlueprintChapters(
  chapterMastery: StudentLearningProfile["chapterMastery"],
  blueprint: Record<Subject, Record<string, BlueprintEntry>>,
) {
  const rows: Array<{
    subject: Subject;
    chapter: string;
    name: string;
    marks: number;
    mastery: number;
  }> = [];

  SUBJECTS.forEach((subject) => {
    const subjectBlueprint = blueprint[subject] ?? {};
    Object.entries(subjectBlueprint).forEach(([chapter, entry]) => {
      if (chapter.startsWith("_")) return;
      rows.push({
        subject,
        chapter,
        name: entry.name,
        marks: entry.marks,
        mastery: chapterMastery[subject]?.[chapter]?.mastery ?? 0,
      });
    });
  });

  return rows;
}

function buildRoiChapter(row: {
  subject: Subject;
  chapter: string;
  name: string;
  marks: number;
  mastery: number;
}): ROIChapter {
  const gainPossible = round2(row.marks * (1 - row.mastery / 100) * 0.82);
  const hoursEstimate = round2(Math.max(0.5, (100 - row.mastery) / 46));
  const roi = round2(gainPossible / hoursEstimate);

  return {
    chapter: row.chapter,
    subject: row.subject,
    name: row.name,
    currentMastery: row.mastery,
    blueprintMarks: row.marks,
    gainPossible,
    hoursEstimate,
    roi,
  };
}

function averageDailyStudyHours(sessions: SessionRecord[]): number {
  const practice = sessions.filter((session) => session.questionsAttempted > 0);
  if (practice.length === 0) return 1;

  const totalMinutes = practice.reduce((sum, session) => sum + session.durationMinutes, 0);
  const activeDays = new Set(practice.map((session) => session.date)).size;
  return round2(totalMinutes / activeDays / 60);
}

function buildFastestPath(rankedChapters: ROIChapter[], gapMarks: number): ROIChapter[] {
  if (gapMarks <= 0) return [];

  const path: ROIChapter[] = [];
  let accumulated = 0;

  for (const chapter of rankedChapters) {
    if (accumulated >= gapMarks) break;
    path.push(chapter);
    accumulated += chapter.gainPossible;
  }

  return path;
}

function buildBySubjectGaps(
  fallbackTarget: number,
  projection: ScoreProjectionOutput,
  subjectTargets?: Record<string, number>,
): Record<string, { target: number; predicted: number; gap: number }> | undefined {
  if (!subjectTargets || Object.keys(subjectTargets).length === 0) return undefined;

  const out: Record<string, { target: number; predicted: number; gap: number }> = {};

  for (const [subjectId, target] of Object.entries(subjectTargets)) {
    const predicted = SUBJECTS.includes(subjectId as Subject)
      ? projection.bySubject[subjectId as Subject].percentage
      : fallbackTarget;
    out[subjectId] = {
      target,
      predicted: round1(predicted),
      gap: round1(Math.max(0, target - predicted)),
    };
  }

  return out;
}

function resolveEffectiveTargetScore(
  targetScore: number,
  subjectTargets?: Record<string, number>,
): number {
  if (!subjectTargets || Object.keys(subjectTargets).length === 0) return targetScore;
  const values = Object.values(subjectTargets);
  return round1(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function targetGapEngine(
  targetScore: number,
  projection: ScoreProjectionOutput,
  chapterMastery: StudentLearningProfile["chapterMastery"],
  blueprint: Record<Subject, Record<string, BlueprintEntry>>,
  sessions: SessionRecord[] = [],
  subjectTargets?: Record<string, number>,
): TargetGapResult {
  const rankedChapters = iterateBlueprintChapters(chapterMastery, blueprint)
    .map(buildRoiChapter)
    .sort((a, b) => b.roi - a.roi || a.hoursEstimate - b.hoursEstimate);

  const effectiveTargetScore = resolveEffectiveTargetScore(targetScore, subjectTargets);
  const currentScore = projection.percentage;
  const gapPercentage = round1(Math.max(0, effectiveTargetScore - currentScore));
  const gapMarks = round2((gapPercentage / 100) * projection.totalMax);
  const bySubject = buildBySubjectGaps(effectiveTargetScore, projection, subjectTargets);
  const fastestPath = buildFastestPath(rankedChapters, gapMarks);
  const fastestPathHours = round2(
    fastestPath.reduce((sum, chapter) => sum + chapter.hoursEstimate, 0),
  );
  const fastestPathGain = round2(
    fastestPath.reduce((sum, chapter) => sum + chapter.gainPossible, 0),
  );

  const avgDailyHours = averageDailyStudyHours(sessions);
  const daysNeeded =
    fastestPathHours > 0 ? Math.max(1, Math.ceil(fastestPathHours / avgDailyHours)) : 0;

  const lastSessionDate =
    sessions
      .filter((session) => session.questionsAttempted > 0)
      .sort((a, b) => parseDate(a.date) - parseDate(b.date))
      .at(-1)?.date ?? new Date().toISOString().slice(0, 10);

  const targetReachable = fastestPathGain >= gapMarks;

  return {
    targetScore: effectiveTargetScore,
    currentScore,
    gap: gapMarks,
    gapPercentage,
    bySubject,
    rankedChapters,
    fastestPath,
    estimatedHours: fastestPathHours,
    targetReachable,
    reachableBy: targetReachable ? addDaysIso(lastSessionDate, daysNeeded) : null,
    computedAt: new Date().toISOString(),
  };
}

export function runTargetGapFromSeed(
  targetScore = (seedProfile as StudentLearningProfile).student.targetScore,
): TargetGapResult {
  const profile = seedProfile as StudentLearningProfile;
  const blueprint = loadSeedBlueprint();
  const projection = scoreProjectionEngine(profile.chapterMastery, blueprint);

  return targetGapEngine(
    targetScore,
    projection,
    profile.chapterMastery,
    blueprint,
    profile.sessionHistory,
  );
}
