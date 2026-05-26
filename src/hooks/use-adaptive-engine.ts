/**
 * useAdaptiveEngine — Task 8
 *
 * Filters and reorders questions based on the student's performance history.
 * 
 * Strategy:
 *   1. Wrong questions from previous sessions appear first
 *   2. Hard questions are shown more if accuracy is high (> 75%)
 *   3. Easy questions are shown more if accuracy is low (< 40%)
 *   4. Medium questions are the default mix
 *   5. Questions not yet attempted are shuffled in
 *
 * Usage:
 *   const adaptedQuestions = useAdaptiveEngine(questions, chapterStats);
 *   // Pass adaptedQuestions to useExamEngine instead of raw questions
 */

import { useMemo } from "react";
import type { Question } from "./use-exam-engine";
import type { ChapterStats } from "./use-analytics";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AdaptiveConfig = {
  chapterStats: ChapterStats | null;
  wrongQuestionIds: string[];    // from previous sessions
  maxQuestions?: number;         // cap the session length (default: all)
};

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAdaptiveEngine(
  questions: Question[],
  config: AdaptiveConfig,
): Question[] {
  return useMemo(() => {
    const { chapterStats, wrongQuestionIds, maxQuestions } = config;
    const accuracy = chapterStats?.accuracy ?? 50;

    // Separate questions by priority
    const wrong = questions.filter((q) => wrongQuestionIds.includes(q.id));
    const remaining = questions.filter((q) => !wrongQuestionIds.includes(q.id));

    const easy = remaining.filter((q) => q.difficulty === "easy");
    const medium = remaining.filter((q) => q.difficulty === "medium");
    const hard = remaining.filter((q) => q.difficulty === "hard");

    let ordered: Question[];

    if (accuracy >= 75) {
      // High performer → more hard questions
      ordered = [
        ...shuffle(wrong),
        ...shuffle(hard),
        ...shuffle(medium),
        ...shuffle(easy),
      ];
    } else if (accuracy < 40) {
      // Struggling → more easy questions, revisit wrong first
      ordered = [
        ...shuffle(wrong),
        ...shuffle(easy),
        ...shuffle(medium),
        ...shuffle(hard),
      ];
    } else {
      // Average → balanced mix, wrong first
      ordered = [
        ...shuffle(wrong),
        ...shuffle(medium),
        ...shuffle(easy),
        ...shuffle(hard),
      ];
    }

    // Deduplicate (wrong questions appear only once)
    const seen = new Set<string>();
    const deduped = ordered.filter((q) => {
      if (seen.has(q.id)) return false;
      seen.add(q.id);
      return true;
    });

    return maxQuestions ? deduped.slice(0, maxQuestions) : deduped;
  }, [questions, config]);
}

// ---------------------------------------------------------------------------
// Helper: get session label based on accuracy
// ---------------------------------------------------------------------------

export function getSessionLabel(accuracy: number | null): {
  label: string;
  description: string;
  emoji: string;
} {
  if (accuracy === null) return {
    label: "Standard",
    description: "All questions in balanced order",
    emoji: "📚",
  };
  if (accuracy >= 75) return {
    label: "Challenge Mode",
    description: "More hard questions — you're ready!",
    emoji: "🔥",
  };
  if (accuracy < 40) return {
    label: "Foundation Mode",
    description: "Starting with easier questions to build confidence",
    emoji: "🌱",
  };
  return {
    label: "Practice Mode",
    description: "Balanced mix of question difficulties",
    emoji: "📖",
  };
}
