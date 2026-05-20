import type {
  ExamHallSection,
  ExamStrategyDoc,
} from "@/integrations/firebase/types";

/**
 * Adaptive exam strategy — recommend section order, time allocation
 * and a calm confidence-recovery message. Weak topics nudge sections
 * earlier (do them with fresh mind) and shift slightly more time to
 * long answers.
 */
export function buildExamStrategy(args: {
  userId: string;
  sessionId: string;
  sections: ExamHallSection[];
  totalDurationSec: number;
  weakChapterIds?: string[];
  averageConfidence?: number; // 0..1
}): Omit<ExamStrategyDoc, "id"> {
  const { sections, totalDurationSec } = args;
  const ordered = [...sections].sort((a, b) => {
    const hasWeakA = a.questions.some((q) =>
      args.weakChapterIds?.includes(q.chapterId ?? ""),
    );
    const hasWeakB = b.questions.some((q) =>
      args.weakChapterIds?.includes(q.chapterId ?? ""),
    );
    if (hasWeakA !== hasWeakB) return hasWeakA ? -1 : 1;
    return (a.recommendedOrder ?? 99) - (b.recommendedOrder ?? 99);
  });

  const totalMarks = sections.reduce(
    (s, sec) => s + sec.questions.reduce((a, q) => a + q.marks, 0),
    0,
  ) || 1;

  const timeAllocation = sections.map((sec) => {
    const sectionMarks = sec.questions.reduce((a, q) => a + q.marks, 0);
    const base = (sectionMarks / totalMarks) * totalDurationSec;
    const longBonus = sec.kind === "long" || sec.kind === "diagram" ? 0.05 : 0;
    return {
      sectionId: sec.id,
      allocSec: Math.round(base * (1 + longBonus)),
    };
  });

  const conf = args.averageConfidence ?? 0.6;
  const confidenceGuidance =
    conf < 0.4
      ? "Start with what you know best. One clean answer rebuilds momentum."
      : conf < 0.7
        ? "Steady pace. Don't get stuck — flag and move on after 2 minutes."
        : "You're ready. Keep your handwriting calm and number every step.";

  return {
    userId: args.userId,
    sessionId: args.sessionId,
    recommendedOrder: ordered.map((s, i) => ({
      sectionId: s.id,
      reason:
        i === 0
          ? "Open with your strongest familiar section."
          : "Stack momentum into the heavier sections next.",
    })),
    timeAllocation,
    confidenceGuidance,
    weakTopicNotes:
      args.weakChapterIds?.slice(0, 3).map((id) => `Review key formulas for ${id}`) ??
      [],
    createdAt: Date.now(),
  };
}