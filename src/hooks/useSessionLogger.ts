import { useCallback } from "react";
import {
  logSessionOnStorage,
  useStudentProfile,
  type LogSessionParams,
} from "@/hooks/useStudentProfile";

export type { LogSessionParams };
export { logSessionOnStorage };

export function useSessionLogger() {
  const { profile, appendSession, updateMastery } = useStudentProfile();

  const logSession = useCallback(
    (params: LogSessionParams): void => {
      const score =
        params.questionsAttempted > 0
          ? Math.round((params.questionsCorrect / params.questionsAttempted) * 100)
          : 0;

      const current = profile.chapterMastery[params.subject]?.[params.chapter]?.mastery ?? 50;
      const newMastery = Math.min(100, Math.round(current * 0.7 + score * 0.3));

      appendSession({
        id: Date.now().toString(),
        date: new Date().toISOString().slice(0, 10),
        subject: params.subject,
        chapter: params.chapter,
        durationMinutes: params.durationMinutes,
        questionsAttempted: params.questionsAttempted,
        questionsCorrect: params.questionsCorrect,
        score,
        hintsUsed: params.hintsUsed,
        retriesOnWrong: params.retriesOnWrong,
        completedPlan: params.completedPlan,
        panicSignal: params.panicSignal,
        engineType: params.engineType,
      });

      updateMastery(params.subject, params.chapter, newMastery);
    },
    [appendSession, profile.chapterMastery, updateMastery],
  );

  return {
    profile,
    logSession,
  };
}
