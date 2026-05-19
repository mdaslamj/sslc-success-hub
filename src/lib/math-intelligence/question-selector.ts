import type {
  MathChapterAnalyticsDoc,
  MathChapterDoc,
  MathQuestionDoc,
  MathQuestionType,
} from "@/integrations/firebase/types";

export type AdaptivePick = {
  question: MathQuestionDoc;
  reason: "weak_chapter" | "repeated_board" | "important" | "due_revision" | "balanced";
};

/**
 * Pick N questions adaptively for a user. Heuristic blend of:
 *   - weak chapters (mastery below threshold)
 *   - repeated board questions
 *   - important / flagged questions
 *   - balanced fill from remaining pool
 */
export function pickAdaptive(args: {
  questions: MathQuestionDoc[];
  chapters: MathChapterDoc[];
  analytics: MathChapterAnalyticsDoc[];
  count: number;
  questionType?: MathQuestionType;
}): AdaptivePick[] {
  const { questions, chapters, analytics, count } = args;
  const pool = args.questionType
    ? questions.filter((q) => q.questionType === args.questionType)
    : questions;

  const analyticsByChapter = new Map(analytics.map((a) => [a.chapterId, a]));
  const chapterById = new Map(chapters.map((c) => [c.id, c]));

  const weakChapterIds = new Set(
    analytics
      .filter((a) => {
        const ch = chapterById.get(a.chapterId);
        return ch ? a.mastery < ch.masteryThreshold : a.mastery < 70;
      })
      .map((a) => a.chapterId),
  );

  const picks: AdaptivePick[] = [];
  const used = new Set<string>();

  const take = (q: MathQuestionDoc, reason: AdaptivePick["reason"]) => {
    if (used.has(q.id) || picks.length >= count) return;
    used.add(q.id);
    picks.push({ question: q, reason });
  };

  // 1) Weak chapters first.
  for (const q of pool) {
    if (picks.length >= count) break;
    if (weakChapterIds.has(q.chapterId)) take(q, "weak_chapter");
  }
  // 2) Repeated board questions.
  for (const q of pool) {
    if (picks.length >= count) break;
    if (q.metadata.isRepeatedBoardQ) take(q, "repeated_board");
  }
  // 3) Important.
  for (const q of pool) {
    if (picks.length >= count) break;
    if (q.metadata.isImportant) take(q, "important");
  }
  // 4) Balanced fill — round-robin by chapter to spread coverage.
  const byChapter = new Map<string, MathQuestionDoc[]>();
  for (const q of pool) {
    const arr = byChapter.get(q.chapterId) ?? [];
    arr.push(q);
    byChapter.set(q.chapterId, arr);
  }
  const chaptersOrdered = Array.from(byChapter.keys());
  let idx = 0;
  while (picks.length < count && chaptersOrdered.length > 0) {
    const chapterId = chaptersOrdered[idx % chaptersOrdered.length];
    const list = byChapter.get(chapterId)!;
    const next = list.find((q) => !used.has(q.id));
    if (next) take(next, "balanced");
    idx++;
    if (idx > chaptersOrdered.length * 5) break;
  }

  // Reference analytics map silences unused-var warnings even when empty.
  void analyticsByChapter;
  return picks;
}

/** Questions due for revision: low mastery + previously attempted. */
export function pickRevisionSet(args: {
  questions: MathQuestionDoc[];
  analytics: MathChapterAnalyticsDoc[];
  count: number;
}): MathQuestionDoc[] {
  const weak = args.analytics
    .slice()
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 5)
    .map((a) => a.chapterId);
  const weakSet = new Set(weak);
  const ranked = args.questions
    .filter((q) => weakSet.has(q.chapterId))
    .sort(
      (a, b) =>
        b.metadata.boardFrequency - a.metadata.boardFrequency ||
        Number(b.metadata.isImportant) - Number(a.metadata.isImportant),
    );
  return ranked.slice(0, args.count);
}