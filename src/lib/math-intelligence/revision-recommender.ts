import type {
  MathChapterAnalyticsDoc,
  MathChapterDoc,
  MathFormulaDoc,
  MathQuestionDoc,
} from "@/integrations/firebase/types";

export type RevisionRecommendation = {
  weakChapters: { chapter: MathChapterDoc; mastery: number; reason: string }[];
  dueFormulas: { formula: MathFormulaDoc; accuracy: number }[];
  repeatedBoardQuestions: MathQuestionDoc[];
};

/**
 * Produce a focused revision plan for a user: weak chapters first, then
 * formulas with low recall accuracy, then high-frequency board questions
 * for the same chapters.
 */
export function buildRevisionRecommendation(args: {
  chapters: MathChapterDoc[];
  analytics: MathChapterAnalyticsDoc[];
  formulas: MathFormulaDoc[];
  questions: MathQuestionDoc[];
  maxChapters?: number;
  maxFormulas?: number;
  maxQuestions?: number;
}): RevisionRecommendation {
  const { chapters, analytics, formulas, questions } = args;
  const chapterById = new Map(chapters.map((c) => [c.id, c]));

  const weakChapters = analytics
    .filter((a) => {
      const ch = chapterById.get(a.chapterId);
      return ch ? a.mastery < ch.masteryThreshold : a.mastery < 70;
    })
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, args.maxChapters ?? 5)
    .map((a) => ({
      chapter: chapterById.get(a.chapterId)!,
      mastery: a.mastery,
      reason:
        a.mastery < 40
          ? "Critical gap — restart from basics"
          : "Below mastery threshold — needs revision",
    }))
    .filter((r) => r.chapter);

  const weakChapterIds = new Set(weakChapters.map((r) => r.chapter.id));

  // Formula accuracy across weak chapters.
  const formulaScores = new Map<string, { attempts: number; correct: number }>();
  for (const a of analytics) {
    for (const [fid, stat] of Object.entries(a.formulaAccuracy)) {
      const prev = formulaScores.get(fid) ?? { attempts: 0, correct: 0 };
      formulaScores.set(fid, {
        attempts: prev.attempts + stat.attempts,
        correct: prev.correct + stat.correct,
      });
    }
  }
  const dueFormulas = formulas
    .map((f) => {
      const s = formulaScores.get(f.id);
      const accuracy = s && s.attempts > 0 ? (s.correct / s.attempts) * 100 : 0;
      return { formula: f, accuracy, attempts: s?.attempts ?? 0 };
    })
    .filter((r) => r.attempts > 0 && r.accuracy < 75)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, args.maxFormulas ?? 6)
    .map(({ formula, accuracy }) => ({ formula, accuracy }));

  const repeatedBoardQuestions = questions
    .filter(
      (q) => weakChapterIds.has(q.chapterId) && q.metadata.isRepeatedBoardQ,
    )
    .sort((a, b) => b.metadata.boardFrequency - a.metadata.boardFrequency)
    .slice(0, args.maxQuestions ?? 8);

  return { weakChapters, dueFormulas, repeatedBoardQuestions };
}