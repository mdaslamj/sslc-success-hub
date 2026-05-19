/**
 * Composes analytics + quiz stats + planner/revision state, runs the pure
 * recommendation engine, and persists results to the local-first store.
 * Swap the storage layer for the Firestore services
 * (`recommendations`, `ai-insights`) once Auth lands without touching the
 * hook's return shape.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { toDayKey } from "@/integrations/firebase/services/analytics";
import type {
  AiInsightDoc,
  RecommendationDoc,
  RecommendationStatus,
} from "@/integrations/firebase/types";
import {
  buildDailyInsight,
  generateRecommendations,
  type RecommendationContext,
} from "@/lib/recommendation-engine";
import {
  readInsight,
  readRecommendations,
  updateRecommendationStatus,
  writeInsight,
  writeRecommendations,
} from "@/lib/recommendation-store";
import { readRevisionCards } from "@/lib/planner-store";
import { subjects as allSubjects } from "@/lib/mock-data";
import type { PlannerSubjectInput } from "@/lib/planner-engine";
import { useAnalytics } from "./use-analytics";
import { useQuizStats } from "./use-quiz-stats";
import { useCurrentUserId } from "./use-current-user";

export type RecommendationsSnapshot = {
  userId: string;
  loading: boolean;
  recommendations: RecommendationDoc[];
  topRecommendation: RecommendationDoc | null;
  insight: AiInsightDoc | null;
  byKind: Record<string, RecommendationDoc[]>;
  dismiss: (recId: string) => void;
  act: (recId: string) => void;
  regenerate: () => void;
};

/** Mirror of planner-engine's subject input builder. Kept local so the
 *  recommendation engine can be reused without dragging in planner hooks. */
function buildSubjectInputs(): PlannerSubjectInput[] {
  return allSubjects.map((s) => ({
    id: s.id,
    name: s.name,
    color: s.color,
    emoji: s.emoji,
    completion: s.completion,
    weakTopics: s.weakTopics,
    chaptersDone: s.chaptersDone,
    chaptersTotal: s.chapters,
    nextChapter:
      s.chaptersDone < s.chapters
        ? {
            id: `${s.id}_ch${s.chaptersDone + 1}`,
            title: `Chapter ${s.chaptersDone + 1}`,
            estimatedMinutes: 35,
          }
        : null,
  }));
}

export function useRecommendations(): RecommendationsSnapshot {
  const userId = useCurrentUserId();
  const analytics = useAnalytics();
  const quiz = useQuizStats();
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(true);

  const subjectInputs = useMemo(buildSubjectInputs, []);
  const dayKey = toDayKey(new Date());

  const runEngine = useCallback(() => {
    if (!userId) return;
    const ctx: RecommendationContext = {
      userId,
      subjects: subjectInputs,
      sessions: analytics.recentSessions,
      revisions: readRevisionCards(userId),
      quiz: {
        attempts: quiz.attempts,
        averageScore: quiz.averageScore,
        weakTopics: quiz.weakTopics,
        bySubject: quiz.bySubject,
      },
      streak: analytics.streak,
      todayMinutes: analytics.todayMinutes,
      overallCompletion: analytics.overallProgress,
    };
    const recs = generateRecommendations(ctx);
    const persisted = writeRecommendations(userId, recs);
    const insight = buildDailyInsight({
      userId,
      dayKey,
      ctx,
      recommendations: persisted,
    });
    writeInsight(insight);
    setTick((n) => n + 1);
  }, [
    userId,
    subjectInputs,
    analytics.recentSessions,
    analytics.streak,
    analytics.todayMinutes,
    analytics.overallProgress,
    quiz.attempts,
    quiz.averageScore,
    quiz.weakTopics,
    quiz.bySubject,
    dayKey,
  ]);

  // Regenerate whenever upstream signals settle.
  useEffect(() => {
    if (!userId || analytics.loading || quiz.loading) return;
    runEngine();
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, analytics.loading, quiz.loading, analytics.todayMinutes, quiz.attempts]);

  const recommendations = useMemo(
    () => readRecommendations(userId).sort((a, b) => b.score - a.score),
    [userId, tick],
  );
  const insight = useMemo(() => readInsight(userId, dayKey), [userId, dayKey, tick]);

  const byKind = useMemo(() => {
    const out: Record<string, RecommendationDoc[]> = {};
    for (const r of recommendations) {
      (out[r.kind] ??= []).push(r);
    }
    return out;
  }, [recommendations]);

  const updateStatus = useCallback((recId: string, status: RecommendationStatus) => {
    updateRecommendationStatus(recId, status);
    setTick((n) => n + 1);
  }, []);

  return {
    userId,
    loading,
    recommendations,
    topRecommendation: recommendations[0] ?? null,
    insight,
    byKind,
    dismiss: (id) => updateStatus(id, "dismissed"),
    act: (id) => updateStatus(id, "acted"),
    regenerate: runEngine,
  };
}