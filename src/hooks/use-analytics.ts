import { useEffect, useMemo, useState } from "react";
import {
  buildWeeklyActivity,
  computeStreak,
  countFocusSessions,
  sumStudyMinutes,
  toDayKey,
} from "@/integrations/firebase/services/analytics";
import type { StudySessionDoc } from "@/integrations/firebase/types";
import { readSessions, appendSession } from "@/lib/analytics-store";
import { useCurrentUserId } from "./use-current-user";
import { subjects as mockSubjects } from "@/lib/mock-data";
import { computeConsistency, type Consistency } from "@/lib/consistency";

export type AnalyticsSnapshot = {
  userId: string;
  loading: boolean;
  overallProgress: number; // 0..100
  completedChapters: number;
  totalChapters: number;
  totalStudyMinutes: number;
  totalStudyHours: number;
  focusSessions: number;
  /** @deprecated UI should read `consistency` instead. Kept for engines that still depend on it. */
  streak: { current: number; longest: number };
  consistency: Consistency;
  weekly: { dayKey: string; label: string; minutes: number }[];
  bySubject: {
    id: string;
    name: string;
    color: string;
    completion: number;
    chaptersDone: number;
    chaptersTotal: number;
    minutes: number;
  }[];
  todayMinutes: number;
  recentSessions: StudySessionDoc[];
  logSession: (input: Omit<StudySessionDoc, "id" | "userId" | "dayKey">) => StudySessionDoc;
  refresh: () => void;
};

/**
 * Reusable analytics aggregator. Reads from the local analytics store today;
 * swap the source to Firestore (`fetchRecentSessions` + `fetchUserProgress`)
 * once Firebase Auth is wired without changing this hook's signature.
 */
export function useAnalytics(): AnalyticsSnapshot {
  const userId = useCurrentUserId();
  const [sessions, setSessions] = useState<StudySessionDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!userId) return;
    setSessions(readSessions(userId));
    setLoading(false);
  }, [userId, tick]);

  const snapshot = useMemo(() => {
    const minutes = sumStudyMinutes(sessions);
    const streak = computeStreak(sessions);
    const consistency = computeConsistency(sessions);
    const weekly = buildWeeklyActivity(sessions);
    const todayKey = toDayKey(new Date());
    const todayMinutes = sessions
      .filter((s) => s.dayKey === todayKey)
      .reduce((a, s) => a + s.durationMinutes, 0);

    // Per-subject roll-up: combine mock subject roster (real chapter counts)
    // with measured study minutes from sessions.
    const minutesBySubject = sessions.reduce<Record<string, number>>((acc, s) => {
      if (s.subjectId) acc[s.subjectId] = (acc[s.subjectId] ?? 0) + s.durationMinutes;
      return acc;
    }, {});
    const bySubject = mockSubjects.map((s) => ({
      id: s.id,
      name: s.name,
      color: s.color,
      completion: s.completion,
      chaptersDone: s.chaptersDone,
      chaptersTotal: s.chapters,
      minutes: minutesBySubject[s.id] ?? 0,
    }));

    const completedChapters = bySubject.reduce((a, s) => a + s.chaptersDone, 0);
    const totalChapters = bySubject.reduce((a, s) => a + s.chaptersTotal, 0);
    const overallProgress = totalChapters
      ? Math.round((completedChapters / totalChapters) * 100)
      : 0;

    return {
      overallProgress,
      completedChapters,
      totalChapters,
      totalStudyMinutes: minutes,
      totalStudyHours: Math.round((minutes / 60) * 10) / 10,
      focusSessions: countFocusSessions(sessions),
      streak,
      consistency,
      weekly,
      bySubject,
      todayMinutes,
      recentSessions: sessions.slice(-20).reverse(),
    };
  }, [sessions]);

  return {
    userId,
    loading,
    ...snapshot,
    logSession: (input) => {
      const doc = appendSession({
        ...input,
        userId,
        dayKey: toDayKey(input.startedAt ?? Date.now()),
      });
      setTick((t) => t + 1);
      return doc;
    },
    refresh: () => setTick((t) => t + 1),
  };
}