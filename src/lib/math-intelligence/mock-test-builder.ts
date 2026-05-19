import type {
  MathChapterDoc,
  MathQuestionDoc,
  MathQuestionType,
} from "@/integrations/firebase/types";

/** Karnataka SSLC-style board blueprint (defaults — overridable). */
export const DEFAULT_BOARD_BLUEPRINT: Record<MathQuestionType, number> = {
  mcq: 8,
  "1mark": 6,
  "2mark": 6,
  "3mark": 6,
  "5mark": 4,
  hots: 2,
  competency: 2,
};

export type MockTestSection = {
  questionType: MathQuestionType;
  questions: MathQuestionDoc[];
};

/**
 * Build a board-style mock test honoring per-chapter boardWeight.
 * Algorithm: for each question type, allocate slots across chapters
 * proportionally to weight, then take the highest-priority questions
 * (board-repeated > important > rest) within each chapter.
 */
export function buildMockTest(args: {
  chapters: MathChapterDoc[];
  questions: MathQuestionDoc[];
  blueprint?: Partial<Record<MathQuestionType, number>>;
}): { sections: MockTestSection[]; totalQuestions: number; totalMarks: number } {
  const blueprint = { ...DEFAULT_BOARD_BLUEPRINT, ...args.blueprint };
  const totalWeight =
    args.chapters.reduce((sum, c) => sum + c.boardWeight, 0) || 1;

  const sections: MockTestSection[] = [];
  let totalMarks = 0;
  let totalQuestions = 0;

  (Object.keys(blueprint) as MathQuestionType[]).forEach((type) => {
    const target = blueprint[type] ?? 0;
    if (target === 0) return;

    const typePool = args.questions.filter((q) => q.questionType === type);
    const allocation: Record<string, number> = {};
    args.chapters.forEach((c) => {
      allocation[c.id] = Math.max(
        0,
        Math.round((c.boardWeight / totalWeight) * target),
      );
    });

    const picks: MathQuestionDoc[] = [];
    args.chapters.forEach((c) => {
      const slots = allocation[c.id] ?? 0;
      if (slots === 0) return;
      const ranked = typePool
        .filter((q) => q.chapterId === c.id)
        .sort(
          (a, b) =>
            Number(b.metadata.isRepeatedBoardQ) -
              Number(a.metadata.isRepeatedBoardQ) ||
            Number(b.metadata.isImportant) - Number(a.metadata.isImportant) ||
            b.metadata.boardFrequency - a.metadata.boardFrequency,
        );
      picks.push(...ranked.slice(0, slots));
    });

    // Top up if rounding left the section short.
    if (picks.length < target) {
      const have = new Set(picks.map((q) => q.id));
      for (const q of typePool) {
        if (picks.length >= target) break;
        if (!have.has(q.id)) picks.push(q);
      }
    }

    sections.push({ questionType: type, questions: picks.slice(0, target) });
    totalQuestions += picks.slice(0, target).length;
    totalMarks += picks
      .slice(0, target)
      .reduce((sum, q) => sum + q.marks, 0);
  });

  return { sections, totalQuestions, totalMarks };
}