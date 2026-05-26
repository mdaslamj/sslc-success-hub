import { useCallback, useMemo } from "react";
import type { QuestionAttempt, Subject } from "@/types/question";
import {
  getDaysSinceLastAttempt,
  getRecentStreakInConcept,
  readAllAttempts,
  saveAttempt,
} from "@/engines/analytics/attemptLogger";
import {
  finaliseSession,
  getOrCreateProfile,
  updateAfterAttempt,
} from "@/engines/analytics/profileUpdater";
import {
  buildWeeklyReport,
  getChapterMasterySummaries,
  getSessionInsights,
} from "@/engines/analytics/sessionAnalytics";

export function useAnalyticsEngine(subject: Subject) {
  const profile = useMemo(() => getOrCreateProfile(), []);
  const allAttempts = useMemo(() => readAllAttempts(), []);

  const recordAttempt = useCallback((attempt: QuestionAttempt) => {
    saveAttempt(attempt);
    updateAfterAttempt(
      attempt.chapterId,
      attempt.concept,
      attempt.isCorrect,
      attempt.confidenceLevel,
      attempt.mistakeTag,
      attempt.timeTakenMs,
    );
  }, []);

  const recordSessionEnd = useCallback((sessionAttempts: QuestionAttempt[]) => {
    finaliseSession(
      sessionAttempts.map((a) => ({
        isCorrect: a.isCorrect,
        confidenceLevel: a.confidenceLevel,
      })),
    );
  }, []);

  const getMidSessionInsights = useCallback(
    (sessionAttempts: QuestionAttempt[]) => {
      return getSessionInsights(sessionAttempts, allAttempts);
    },
    [allAttempts],
  );

  const getQuestionContext = useCallback(
    (chapterId: string, concept: string, examWeightage?: number) => {
      const streak = getRecentStreakInConcept(concept, 2);
      if (streak === "wrong") {
        return "You got the last 2 questions in this topic wrong";
      }
      const days = getDaysSinceLastAttempt(chapterId);
      if (days !== null && days >= 4) {
        return `You haven't practiced this chapter in ${days} day${days > 1 ? "s" : ""}`;
      }
      if (examWeightage && examWeightage >= 4) {
        return `This chapter carries ${examWeightage} marks in your board exam`;
      }
      return null;
    },
    [],
  );

  const weeklyReport = useMemo(() => buildWeeklyReport(subject), [subject]);

  const chapterSummaries = useMemo(
    () => getChapterMasterySummaries(subject),
    [subject],
  );

  return {
    profile,
    recordAttempt,
    recordSessionEnd,
    getMidSessionInsights,
    getQuestionContext,
    weeklyReport,
    chapterSummaries,
  };
}
