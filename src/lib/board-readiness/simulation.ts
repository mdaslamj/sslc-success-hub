import type {
  DifficultyLevel,
  ExamSimulationDoc,
  ExamSimulationSection,
  MemoryTrackingDoc,
} from "@/integrations/firebase/types";

export type ChapterBlueprint = {
  chapterId: string;
  chapterTitle?: string;
  /** Board weightage, 0..1. */
  weightage: number;
  /** Pool of questionIds available for this chapter. */
  questionPool: string[];
  /** Optional retention / risk inputs. */
  retentionScore?: number;
  marksAtRisk?: number;
};

/**
 * Build a mock SSLC paper. Distributes `totalMarks` proportionally by
 * weightage, with a marks-at-risk and retention nudge so weaker chapters
 * get slightly more coverage.
 */
export function buildExamSimulation(args: {
  userId: string;
  blueprints: ChapterBlueprint[];
  difficultyLevel: DifficultyLevel;
  totalMarks?: number;
  durationMinutes?: number;
  memory?: MemoryTrackingDoc[];
}): Omit<ExamSimulationDoc, "id"> {
  const now = Date.now();
  const totalMarks = args.totalMarks ?? 80;
  const duration = args.durationMinutes ?? 180;

  // Adjust weights: weaker chapters (low retention, high marks-at-risk) get +bonus.
  const adjusted = args.blueprints.map((b) => {
    const mem = args.memory?.find((m) => m.chapterId === b.chapterId);
    const retention = mem?.retentionScore ?? b.retentionScore ?? 60;
    const risk = mem?.marksAtRisk ?? b.marksAtRisk ?? 0;
    const bonus = (100 - retention) / 400 + Math.min(0.15, risk / 100);
    return { ...b, adjustedWeight: b.weightage + bonus };
  });
  const sumW = adjusted.reduce((a, b) => a + b.adjustedWeight, 0) || 1;

  const sections: ExamSimulationSection[] = adjusted.map((b) => {
    const share = b.adjustedWeight / sumW;
    const marks = Math.max(1, Math.round(totalMarks * share));
    // Roughly 1 question per 2 marks at board level; easier paper uses smaller q's.
    const qCount = Math.max(
      1,
      Math.round(
        marks /
          (args.difficultyLevel === "board"
            ? 3
            : args.difficultyLevel === "medium"
              ? 2
              : 1.5),
      ),
    );
    return {
      chapterId: b.chapterId,
      chapterTitle: b.chapterTitle,
      questionIds: b.questionPool.slice(0, qCount),
      difficultyLevel: args.difficultyLevel,
      marksAllocated: marks,
    };
  });

  return {
    userId: args.userId,
    chaptersIncluded: args.blueprints.map((b) => ({
      chapterId: b.chapterId,
      weightage: b.weightage,
      marksAtRisk: b.marksAtRisk,
    })),
    sections,
    difficultyLevel: args.difficultyLevel,
    duration,
    status: "draft",
    totalMarks,
    retentionSnapshot: args.memory?.map((m) => ({
      chapterId: m.chapterId,
      retentionScore: m.retentionScore ?? 60,
      band: m.retentionBand,
    })),
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Adaptive difficulty progression — promote one level after a passing run.
 */
export function nextDifficulty(
  current: DifficultyLevel,
  scorePct: number,
): DifficultyLevel {
  const pass = scorePct >= 0.7;
  if (!pass) return current;
  if (current === "easier") return "medium";
  if (current === "medium") return "board";
  return "board";
}