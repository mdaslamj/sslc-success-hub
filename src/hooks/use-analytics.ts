/**
 * useAnalytics — Task 5
 *
 * Tracks and persists student performance across sessions.
 * Stores data in localStorage. Provides per-chapter and per-subject stats.
 * Used by AnalyticsDashboard and AdaptiveDifficulty engine.
 */

import { useState, useEffect, useCallback } from "react";
import type { Question } from "./use-exam-engine";

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
};

export function useAnalytics(): AnalyticsEngine {
  const [data, setData] = useState<AnalyticsData>(loadData);

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

  return { data, recordAttempt, getChapterStats, getSubjectStats, getWeakChapters, clearData };
}
