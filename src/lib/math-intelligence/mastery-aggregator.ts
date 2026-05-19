/**
 * Mastery aggregator — combines every Math learning signal we capture into a
 * single per-chapter score. Pure function so it can be unit-tested and reused
 * by the chapter hub, the chapter list, and the prediction engine.
 *
 * Inputs are intentionally loose (all optional) so the same helper works for
 * users who only have quiz data, only OCR evaluations, or any mix.
 *
 * Weights:
 *   40% quiz/MCQ analytics (math_chapter_analytics.mastery)
 *   25% mock exam math score (MockExamResultDoc.bySubject["math"])
 *   25% OCR evaluation average for this chapter
 *   10% formula recall accuracy
 */
import type {
  EvaluationDoc,
  MathChapterAnalyticsDoc,
  MathChapterDoc,
  MockExamResultDoc,
} from "@/integrations/firebase/types";

export type ChapterMastery = {
  chapterId: string;
  /** 0..100 weighted mastery. */
  mastery: number;
  /** Breakdown of each signal that fed the score (0..100 each, or null when no data). */
  breakdown: {
    quiz: number | null;
    mockExam: number | null;
    evaluation: number | null;
    formula: number | null;
  };
  weakConcepts: string[];
  strongConcepts: string[];
  /** Estimated marks the chapter contributes to the board paper (out of `paperTotal`). */
  predictedMarks: number;
  /** Source signal count (0..4) — drives confidence in the score. */
  signalCount: number;
  lastUpdated: number;
};

const W = { quiz: 0.4, mockExam: 0.25, evaluation: 0.25, formula: 0.1 };

function formulaAccuracyPct(a: MathChapterAnalyticsDoc | undefined): number | null {
  if (!a) return null;
  const entries = Object.values(a.formulaAccuracy);
  const attempted = entries.filter((e) => e.attempts > 0);
  if (attempted.length === 0) return null;
  const total = attempted.reduce((s, e) => s + e.attempts, 0);
  const correct = attempted.reduce((s, e) => s + e.correct, 0);
  return total > 0 ? (correct / total) * 100 : null;
}

function evaluationAvgFor(
  chapterId: string,
  evals: EvaluationDoc[],
): { avg: number | null; weak: string[] } {
  const matched = evals.filter((e) => e.chapterId === chapterId);
  if (matched.length === 0) return { avg: null, weak: [] };
  const avg =
    matched.reduce((s, e) => s + e.percentage, 0) / matched.length;
  const weak = Array.from(
    new Set(matched.flatMap((e) => e.weakConcepts.map((w) => w.topic))),
  ).slice(0, 6);
  return { avg, weak };
}

function mockExamMathAvg(results: MockExamResultDoc[]): number | null {
  const scores: number[] = [];
  for (const r of results) {
    const m = r.bySubject?.["math"];
    if (m && m.total > 0) scores.push(m.accuracy);
  }
  if (scores.length === 0) return null;
  // Most-recent first (results are sorted by endedAt desc on the read path);
  // weight the last 3 attempts equally — keeps the score responsive.
  const last = scores.slice(0, 3);
  return last.reduce((s, n) => s + n, 0) / last.length;
}

export function aggregateChapterMastery(args: {
  chapter: MathChapterDoc;
  analytics?: MathChapterAnalyticsDoc | null;
  evaluations?: EvaluationDoc[];
  mockResults?: MockExamResultDoc[];
  paperTotal?: number; // total marks on the math board paper
}): ChapterMastery {
  const {
    chapter,
    analytics,
    evaluations = [],
    mockResults = [],
    paperTotal = 80,
  } = args;

  const quiz = analytics && analytics.mastery > 0 ? analytics.mastery : null;
  const formula = formulaAccuracyPct(analytics ?? undefined);
  const { avg: evaluation, weak: weakFromEvals } = evaluationAvgFor(
    chapter.id,
    evaluations,
  );
  const mockExam = mockExamMathAvg(mockResults);

  const signals: [number | null, number][] = [
    [quiz, W.quiz],
    [mockExam, W.mockExam],
    [evaluation, W.evaluation],
    [formula, W.formula],
  ];
  const present = signals.filter(([v]) => v !== null) as [number, number][];
  const totalWeight = present.reduce((s, [, w]) => s + w, 0);
  const mastery =
    totalWeight > 0
      ? +(
          present.reduce((s, [v, w]) => s + v * w, 0) / totalWeight
        ).toFixed(1)
      : 0;

  const weakConcepts = Array.from(
    new Set([...(analytics?.weakConcepts ?? []), ...weakFromEvals]),
  ).slice(0, 8);
  const strongConcepts = (analytics?.strongConcepts ?? []).slice(0, 8);

  const predictedMarks = Math.round((chapter.boardWeight / 100) * paperTotal);

  return {
    chapterId: chapter.id,
    mastery,
    breakdown: { quiz, mockExam, evaluation, formula },
    weakConcepts,
    strongConcepts,
    predictedMarks,
    signalCount: present.length,
    lastUpdated: analytics?.lastUpdated ?? Date.now(),
  };
}

/**
 * Rank chapters by predicted impact: weight × (1 − mastery/100). High-weight
 * chapters with low mastery rise to the top — used by `/predictions` to tell
 * the student where focus would move the needle most.
 */
export function rankChaptersByImpact(
  chapters: MathChapterDoc[],
  masteryById: Map<string, ChapterMastery>,
  paperTotal = 80,
): Array<{
  chapter: MathChapterDoc;
  mastery: ChapterMastery;
  /** Estimated marks at risk if mastery stays as-is. */
  marksAtRisk: number;
}> {
  return chapters
    .map((c) => {
      const m =
        masteryById.get(c.id) ??
        aggregateChapterMastery({ chapter: c, paperTotal });
      const marksAtRisk = +((m.predictedMarks * (100 - m.mastery)) / 100).toFixed(
        1,
      );
      return { chapter: c, mastery: m, marksAtRisk };
    })
    .sort((a, b) => b.marksAtRisk - a.marksAtRisk);
}
