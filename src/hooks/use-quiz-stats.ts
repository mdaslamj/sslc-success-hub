/**
 * Aggregate quiz stats for analytics + achievement evaluation.
 * Reads attempts from the local-first store today; swap for
 * `fetchRecentQuizAttempts` once Firebase Auth lands without changing the
 * hook's return shape.
 */

import { useEffect, useState } from "react";
import type { QuizAttemptDoc } from "@/integrations/firebase/types";
import { aggregateAttempts, type QuizAggregate } from "@/lib/quiz-engine";
import { readQuizAttempts } from "@/lib/quiz-store";
import { useCurrentUserId } from "./use-current-user";

export type QuizStatsSnapshot = QuizAggregate & {
  userId: string;
  loading: boolean;
  attemptsList: QuizAttemptDoc[];
  refresh: () => void;
};

export function useQuizStats(): QuizStatsSnapshot {
  const userId = useCurrentUserId();
  const [attemptsList, setAttempts] = useState<QuizAttemptDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!userId) return;
    setAttempts(readQuizAttempts(userId));
    setLoading(false);
  }, [userId, tick]);

  const agg = aggregateAttempts(attemptsList);
  return {
    userId,
    loading,
    attemptsList,
    ...agg,
    refresh: () => setTick((t) => t + 1),
  };
}