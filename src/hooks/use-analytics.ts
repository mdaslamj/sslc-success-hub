/**
 * useAnalytics — unified analytics snapshot.
 *
 * Combines two prior shapes:
 *  1. Practice-page quiz attempt tracking (recordAttempt / getChapterStats / ...).
 *  2. Dashboard study-session snapshot (sessions, streak, weekly, bySubject,
 *     consistency, todayMinutes, focusSessions, completion stats, logSession,
 *     refresh) consumed by routes/analytics, routes/log, routes/focus,
 *     routes/planner, routes/profile, routes/achievements, use-achievements,
 *     use-gamification, use-planner, use-recommendations, revision-planner-card.
 *
 * Storage stays local-first via @/lib/analytics-store; swap for the Firestore
 * `study-sessions` service once Auth lands without changing this surface.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import type { Question } from "./use-exam-engine";
import type { StudySessionDoc } from "@/integrations/firebase/types";
import { useCurrentUserId } from "./use-current-user";
import { subjects as allSubjects } from "@/lib/mock-data";
import {
  toDayKey,
  computeStreak,
  buildWeeklyActivity,
  countFocusSessions,
  sumStudyMinutes,
} from "@/integrations/firebase/services/analytics";
import { appendSession, readSessions } from "@/lib/analytics-store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QuestionAttempt = {
  questionId: string;
  chapterId: string;
  subjectId: string;
  isCorrect: boolean;
  timeTakenMs: number;
  difficulty: "easy" | "medium" | "hard";
  attemptedAt: number; // timestamp
};

export type ChapterStats = {
  chapterId: string;
  chapterName: string;
  subjectId: string;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;        // 0–100
  avgTimeSecs: number;
  lastAttemptAt: number | null;
  weakTopics: string[];
};

export type SubjectStats = {
  subjectId: string;
  totalAttempts: number;
  correctAttempts: number;
  accuracy: number;
  chaptersAttempted: number;
};

export type AnalyticsData = {
  attempts: QuestionAttempt[];
  chapterStats: Record<string, ChapterStats>;
  subjectStats: Record<string, SubjectStats>;
  totalQuestionsAttempted: number;
  overallAccuracy: number;
  streakDays: number;
  lastStudiedAt: number | null;
};

// ---------------------------------------------------------------------------
// Storage key
// ---------------------------------------------------------------------------
const STORAGE_KEY = "aura_analytics_v1";

function loadData(): AnalyticsData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    attempts: [],
    chapterStats: {},
    subjectStats: {},
    totalQuestionsAttempted: 0,
    overallAccuracy: 0,
    streakDays: 0,
    lastStudiedAt: null,
  };
}

function saveData(data: AnalyticsData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export type AnalyticsEngine = {
  data: AnalyticsData;
  recordAttempt: (params: {
    question: Question;
    chapterId: string;
    subjectId: string;
    chapterName: string;
    isCorrect: boolean;
    timeTakenMs: number;
  }) => void;
  getChapterStats: (chapterId: string) => ChapterStats | null;
  getSubjectStats: (subjectId: string) => SubjectStats | null;
  getWeakChapters: (subjectId?: string) => ChapterStats[];
  clearData: () => void;
  // ---- Dashboard snapshot ----
  userId: string;
  loading: boolean;
  sessions: StudySessionDoc[];
  recentSessions: StudySessionDoc[];
  weekly: { dayKey: string; label: string; minutes: number }[];
  consistency: { daysActiveLast14: number; label: string; message: string };
  streak: { current: number; longest: number };
  todayMinutes: number;
  totalStudyMinutes: number;
  totalStudyHours: number;
  focusSessions: number;
  bySubject: Array<{
    id: string;
    name: string;
    color: string;
    emoji: string;
    completion: number;
    chaptersDone: number;
    chaptersTotal: number;
    minutes: number;
    sessions: number;
  }>;
  completedChapters: number;
  totalChapters: number;
  overallProgress: number;
  logSession: (
    input: Omit<StudySessionDoc, "id" | "userId" | "dayKey">,
  ) => StudySessionDoc | undefined;
  refresh: () => void;
};

function computeConsistency(
  last14: { minutes: number }[],
): { daysActiveLast14: number; label: string; message: string } {
  const daysActiveLast14 = last14.filter((d) => d.minutes > 0).length;
  let label = "Building";
  let message = "Try a short focus session today.";
  if (daysActiveLast14 >= 12) {
    label = "On fire";
    message = "Incredible consistency — keep the streak alive.";
  } else if (daysActiveLast14 >= 8) {
    label = "Steady";
    message = "Solid rhythm — keep showing up.";
  } else if (daysActiveLast14 >= 4) {
    label = "Warming up";
    message = "Aim for a daily check-in.";
  }
  return { daysActiveLast14, label, message };
}

function buildLast14Days(
  sessions: Pick<StudySessionDoc, "dayKey" | "durationMinutes">[],
  today: Date = new Date(),
): { dayKey: string; minutes: number }[] {
  const byDay = new Map<string, number>();
  for (const s of sessions) {
    byDay.set(s.dayKey, (byDay.get(s.dayKey) ?? 0) + (s.durationMinutes ?? 0));
  }
  const out: { dayKey: string; minutes: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = toDayKey(d);
    out.push({ dayKey: key, minutes: byDay.get(key) ?? 0 });
  }
  return out;
}

export function useAnalytics(): AnalyticsEngine {
  const [data, setData] = useState<AnalyticsData>(loadData);
  const userId = useCurrentUserId();
  const [sessions, setSessions] = useState<StudySessionDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!userId) return;
    setSessions(readSessions(userId));
    setLoading(false);
  }, [userId, tick]);

  // Persist to localStorage whenever data changes
  useEffect(() => {
    saveData(data);
  }, [data]);

  const recordAttempt = useCallback((params: {
    question: Question;
    chapterId: string;
    subjectId: string;
    chapterName: string;
    isCorrect: boolean;
    timeTakenMs: number;
  }) => {
    const { question, chapterId, subjectId, chapterName, isCorrect, timeTakenMs } = params;

    const attempt: QuestionAttempt = {
      questionId: question.id,
      chapterId,
      subjectId,
      isCorrect,
      timeTakenMs,
      difficulty: question.difficulty,
      attemptedAt: Date.now(),
    };

    setData((prev) => {
      const newAttempts = [...prev.attempts, attempt];

      // Recalculate chapter stats
      const chapterAttempts = newAttempts.filter((a) => a.chapterId === chapterId);
      const correct = chapterAttempts.filter((a) => a.isCorrect).length;
      const avgTime = chapterAttempts.reduce((s, a) => s + a.timeTakenMs, 0) / chapterAttempts.length / 1000;

      // Find wrong question topics
      const wrongAttempts = newAttempts.filter((a) => a.chapterId === chapterId && !a.isCorrect);
      const weakTopics = [...new Set(wrongAttempts.map((a) => {
        // Find concept from original question if possible — fallback to chapterId
        return question.concept || chapterId;
      }))].slice(0, 3);

      const updatedChapterStats: ChapterStats = {
        chapterId,
        chapterName,
        subjectId,
        totalAttempts: chapterAttempts.length,
        correctAttempts: correct,
        accuracy: Math.round((correct / chapterAttempts.length) * 100),
        avgTimeSecs: Math.round(avgTime),
        lastAttemptAt: Date.now(),
        weakTopics,
      };

      // Recalculate subject stats
      const subjectAttempts = newAttempts.filter((a) => a.subjectId === subjectId);
      const subjectCorrect = subjectAttempts.filter((a) => a.isCorrect).length;
      const chaptersAttempted = new Set(subjectAttempts.map((a) => a.chapterId)).size;

      const updatedSubjectStats: SubjectStats = {
        subjectId,
        totalAttempts: subjectAttempts.length,
        correctAttempts: subjectCorrect,
        accuracy: Math.round((subjectCorrect / subjectAttempts.length) * 100),
        chaptersAttempted,
      };

      // Overall stats
      const totalCorrect = newAttempts.filter((a) => a.isCorrect).length;
      const overallAccuracy = Math.round((totalCorrect / newAttempts.length) * 100);

      return {
        ...prev,
        attempts: newAttempts,
        chapterStats: { ...prev.chapterStats, [chapterId]: updatedChapterStats },
        subjectStats: { ...prev.subjectStats, [subjectId]: updatedSubjectStats },
        totalQuestionsAttempted: newAttempts.length,
        overallAccuracy,
        lastStudiedAt: Date.now(),
      };
    });
  }, []);

  const getChapterStats = useCallback((chapterId: string) => {
    return data.chapterStats[chapterId] ?? null;
  }, [data]);

  const getSubjectStats = useCallback((subjectId: string) => {
    return data.subjectStats[subjectId] ?? null;
  }, [data]);

  const getWeakChapters = useCallback((subjectId?: string) => {
    const chapters = Object.values(data.chapterStats)
      .filter((c) => subjectId ? c.subjectId === subjectId : true)
      .filter((c) => c.totalAttempts >= 3) // only meaningful after 3+ attempts
      .sort((a, b) => a.accuracy - b.accuracy); // lowest accuracy first
    return chapters.slice(0, 5);
  }, [data]);

  const clearData = useCallback(() => {
    const empty: AnalyticsData = {
      attempts: [], chapterStats: {}, subjectStats: {},
      totalQuestionsAttempted: 0, overallAccuracy: 0,
      streakDays: 0, lastStudiedAt: null,
    };
    setData(empty);
    saveData(empty);
  }, []);

  // ---- Dashboard derivations ----
  const recentSessions = useMemo(
    () => sessions.slice().sort((a, b) => b.startedAt - a.startedAt).slice(0, 20),
    [sessions],
  );
  const weekly = useMemo(() => buildWeeklyActivity(sessions), [sessions]);
  const last14 = useMemo(() => buildLast14Days(sessions), [sessions]);
  const consistency = useMemo(() => computeConsistency(last14), [last14]);
  const streak = useMemo(() => computeStreak(sessions), [sessions]);
  const todayMinutes = useMemo(() => {
    const key = toDayKey(new Date());
    return sumStudyMinutes(sessions.filter((s) => s.dayKey === key));
  }, [sessions]);
  const totalStudyMinutes = useMemo(
    () => sumStudyMinutes(sessions),
    [sessions],
  );
  const totalStudyHours = Math.round((totalStudyMinutes / 60) * 10) / 10;
  const focusSessions = useMemo(() => countFocusSessions(sessions), [sessions]);

  const bySubject = useMemo(() => {
    return allSubjects.map((s) => {
      const subSessions = sessions.filter((x) => x.subjectId === s.id);
      const minutes = sumStudyMinutes(subSessions);
      return {
        id: s.id,
        name: s.name,
        color: s.color,
        emoji: s.emoji,
        completion: s.completion,
        chaptersDone: s.chaptersDone,
        chaptersTotal: s.chapters,
        minutes,
        sessions: subSessions.length,
      };
    });
  }, [sessions]);

  const completedChapters = useMemo(
    () => allSubjects.reduce((a, s) => a + s.chaptersDone, 0),
    [],
  );
  const totalChapters = useMemo(
    () => allSubjects.reduce((a, s) => a + s.chapters, 0),
    [],
  );
  const overallProgress = totalChapters
    ? Math.round((completedChapters / totalChapters) * 100)
    : 0;

  const logSession = useCallback(
    (input: Omit<StudySessionDoc, "id" | "userId" | "dayKey">) => {
      if (!userId) return undefined;
      const dayKey = toDayKey(input.startedAt);
      const saved = appendSession({ ...input, userId, dayKey });
      setSessions((prev) => [...prev, saved]);
      return saved;
    },
    [userId],
  );

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  return {
    // Quiz-attempt API (kept for any future practice tracking call sites)
    data,
    recordAttempt,
    getChapterStats,
    getSubjectStats,
    getWeakChapters,
    clearData,
    // Dashboard snapshot
    userId,
    loading,
    sessions,
    recentSessions,
    weekly,
    consistency,
    streak,
    todayMinutes,
    totalStudyMinutes,
    totalStudyHours,
    focusSessions,
    bySubject,
    completedChapters,
    totalChapters,
    overallProgress,
    logSession,
    refresh,
  };
}
