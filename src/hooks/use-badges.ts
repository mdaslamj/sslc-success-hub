/**
 * use-badges.ts — Task 14
 * Computes earned badges from local analytics data.
 * Does NOT touch the existing Firebase gamification system.
 */

import { useMemo } from "react";
import type { AnalyticsData } from "@/hooks/use-analytics";
import type { MockExamRecord } from "@/hooks/use-mock-exam-history";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Badge = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  earned: boolean;
  earnedAt?: number;
  category: "practice" | "accuracy" | "streak" | "exam" | "explorer";
};

// ---------------------------------------------------------------------------
// Badge definitions
// ---------------------------------------------------------------------------

function computeBadges(
  analytics: AnalyticsData,
  examHistory: MockExamRecord[],
): Badge[] {
  const attempts = analytics.totalQuestionsAttempted;
  const accuracy = analytics.overallAccuracy;
  const chaptersCount = Object.keys(analytics.chapterStats).length;
  const perfectChapters = Object.values(analytics.chapterStats)
    .filter((c) => c.accuracy === 100).length;
  const bestExam = examHistory.length > 0
    ? Math.max(...examHistory.map((e) => e.accuracy))
    : 0;

  return [
    // Practice badges
    {
      id: "first-question",
      emoji: "🌱",
      title: "First Step",
      description: "Answer your first question",
      earned: attempts >= 1,
      category: "practice",
    },
    {
      id: "practice-10",
      emoji: "📚",
      title: "Getting Started",
      description: "Answer 10 questions",
      earned: attempts >= 10,
      category: "practice",
    },
    {
      id: "practice-50",
      emoji: "📖",
      title: "Dedicated Learner",
      description: "Answer 50 questions",
      earned: attempts >= 50,
      category: "practice",
    },
    {
      id: "practice-100",
      emoji: "🎓",
      title: "Century Scholar",
      description: "Answer 100 questions",
      earned: attempts >= 100,
      category: "practice",
    },
    {
      id: "practice-200",
      emoji: "🏆",
      title: "SSLC Champion",
      description: "Answer 200 questions",
      earned: attempts >= 200,
      category: "practice",
    },

    // Accuracy badges
    {
      id: "accuracy-60",
      emoji: "🎯",
      title: "On Target",
      description: "Reach 60% overall accuracy",
      earned: accuracy >= 60,
      category: "accuracy",
    },
    {
      id: "accuracy-75",
      emoji: "⭐",
      title: "Sharp Mind",
      description: "Reach 75% overall accuracy",
      earned: accuracy >= 75,
      category: "accuracy",
    },
    {
      id: "accuracy-90",
      emoji: "💫",
      title: "Distinction Level",
      description: "Reach 90% overall accuracy",
      earned: accuracy >= 90,
      category: "accuracy",
    },
    {
      id: "perfect-chapter",
      emoji: "✨",
      title: "Perfect Chapter",
      description: "Score 100% in any chapter",
      earned: perfectChapters >= 1,
      category: "accuracy",
    },
    {
      id: "perfect-3-chapters",
      emoji: "🌟",
      title: "Triple Perfection",
      description: "Score 100% in 3 chapters",
      earned: perfectChapters >= 3,
      category: "accuracy",
    },

    // Explorer badges
    {
      id: "explorer-3",
      emoji: "🗺️",
      title: "Explorer",
      description: "Practice 3 different chapters",
      earned: chaptersCount >= 3,
      category: "explorer",
    },
    {
      id: "explorer-8",
      emoji: "🧭",
      title: "Adventurer",
      description: "Practice 8 different chapters",
      earned: chaptersCount >= 8,
      category: "explorer",
    },
    {
      id: "all-subjects",
      emoji: "🌍",
      title: "All-Rounder",
      description: "Practice all 3 subjects",
      earned: Object.keys(analytics.subjectStats).length >= 3,
      category: "explorer",
    },

    // Exam badges
    {
      id: "first-exam",
      emoji: "📝",
      title: "First Exam",
      description: "Complete your first mock exam",
      earned: examHistory.length >= 1,
      category: "exam",
    },
    {
      id: "exam-5",
      emoji: "📋",
      title: "Exam Veteran",
      description: "Complete 5 mock exams",
      earned: examHistory.length >= 5,
      category: "exam",
    },
    {
      id: "exam-pass",
      emoji: "✅",
      title: "Exam Pass",
      description: "Score 35%+ in a mock exam",
      earned: bestExam >= 35,
      category: "exam",
    },
    {
      id: "exam-distinction",
      emoji: "🥇",
      title: "Exam Distinction",
      description: "Score 75%+ in a mock exam",
      earned: bestExam >= 75,
      category: "exam",
    },
  ];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useBadges(
  analytics: AnalyticsData,
  examHistory: MockExamRecord[],
) {
  const badges = useMemo(
    () => computeBadges(analytics, examHistory),
    [analytics, examHistory],
  );

  const earned = badges.filter((b) => b.earned);
  const locked = badges.filter((b) => !b.earned);
  const nextBadge = locked[0] ?? null;

  return { badges, earned, locked, nextBadge };
}
