/**
 * Smart Study Planner hook. Composes analytics + quiz stats + revision queue
 * and runs the pure `generateDailyPlan` engine. Persists to the local-first
 * planner store today; swap the storage layer for the Firestore services
 * (study-plans / planner-tasks / revision-schedules) once Auth lands without
 * changing this hook's return shape.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { toDayKey } from "@/integrations/firebase/services/analytics";
import type {
  PlannerTaskDoc,
  PlannerTaskStatus,
  RevisionScheduleDoc,
  StudyPlanDoc,
} from "@/integrations/firebase/types";
import {
  bucketRevisions,
  generateDailyPlan,
  scheduleNextReview,
  seedRevisionCard,
  type PlannerExamInput,
  type PlannerSubjectInput,
} from "@/lib/planner-engine";
import {
  readPlannerTasks,
  readRevisionCards,
  readStudyPlan,
  updatePlannerTaskStatus,
  upsertRevisionCard,
  writePlannerTasks,
  writeStudyPlan,
} from "@/lib/planner-store";
import { subjects as allSubjects } from "@/lib/mock-data";
import { useAnalytics } from "./use-analytics";
import { useQuizStats } from "./use-quiz-stats";
import { useCurrentUserId } from "./use-current-user";

export type PlannerOptions = {
  /** Override the day the planner targets (default: today). */
  date?: Date;
  /** Available study minutes — overrides the engine heuristic. */
  availableMinutes?: number;
  /** Upcoming exams for countdown + pressure factor. */
  exams?: PlannerExamInput[];
};

export type PlannerSnapshot = {
  userId: string;
  loading: boolean;
  plan: StudyPlanDoc | null;
  tasks: PlannerTaskDoc[];
  completionPercent: number;
  doneMinutes: number;
  targetMinutes: number;
  revisions: {
    overdue: RevisionScheduleDoc[];
    today: RevisionScheduleDoc[];
    upcoming: RevisionScheduleDoc[];
    all: RevisionScheduleDoc[];
  };
  weakSubjects: PlannerSubjectInput[];
  recommendedNextChapter: { subject: PlannerSubjectInput; chapter: NonNullable<PlannerSubjectInput["nextChapter"]> } | null;
  examCountdownDays: number | null;
  rationale: string[];
  setTaskStatus: (taskId: string, status: PlannerTaskStatus) => void;
  regenerate: () => void;
  /** Seed/refresh a spaced-repetition card after a chapter completion. */
  trackChapterCompletion: (input: {
    subjectId: string;
    chapterId: string;
    chapterTitle?: string;
  }) => void;
  /** Record a review with quality 0..5 — re-schedules the card. */
  reviewRevision: (cardId: string, quality: number) => RevisionScheduleDoc | null;
};

/** Build subject inputs for the engine — currently driven by mock-data;
 *  swap with Firestore-backed subjects + chapters once Auth + reads land. */
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

export function usePlanner(opts: PlannerOptions = {}): PlannerSnapshot {
  const userId = useCurrentUserId();
  const analytics = useAnalytics();
  const quiz = useQuizStats();
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(true);

  const date = opts.date ?? new Date();
  const dayKey = toDayKey(date);
  const planId = `${userId}_d_${dayKey}`;

  const subjectInputs = useMemo(buildSubjectInputs, []);

  // Generate (or refresh) the daily plan whenever inputs change.
  useEffect(() => {
    if (!userId || analytics.loading || quiz.loading) return;
    const existing = readStudyPlan(planId);
    if (existing) {
      setLoading(false);
      return;
    }
    const revisions = readRevisionCards(userId);
    const generated = generateDailyPlan({
      userId,
      date,
      subjects: subjectInputs,
      sessions: analytics.recentSessions,
      revisions,
      quizStats: {
        averageScore: quiz.averageScore,
        weakTopics: quiz.weakTopics,
        bySubject: quiz.bySubject,
      },
      streak: analytics.streak,
      availableMinutes: opts.availableMinutes,
      exams: opts.exams,
    });
    const now = Date.now();
    writeStudyPlan({ ...generated.plan, createdAt: now, updatedAt: now });
    writePlannerTasks(
      generated.tasks.map((t) => ({ ...t, createdAt: now, completedAt: null })),
    );
    setLoading(false);
    setTick((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, planId, analytics.loading, quiz.loading]);

  const plan = useMemo(() => readStudyPlan(planId), [planId, tick]);
  const tasks = useMemo(
    () => readPlannerTasks(userId, planId).sort((a, b) => b.priority - a.priority),
    [userId, planId, tick],
  );
  const revisionsAll = useMemo(() => readRevisionCards(userId), [userId, tick]);
  const revisionsBucket = useMemo(
    () => bucketRevisions(revisionsAll, date.getTime()),
    [revisionsAll, date],
  );

  const doneTasks = tasks.filter((t) => t.status === "done");
  const doneMinutes = doneTasks.reduce((a, t) => a + t.durationMinutes, 0);
  const targetMinutes = plan?.targetMinutes ?? tasks.reduce((a, t) => a + t.durationMinutes, 0);
  const completionPercent = tasks.length
    ? Math.round((doneTasks.length / tasks.length) * 100)
    : 0;

  const weakSubjects = subjectInputs.filter((s) => s.weakTopics.length > 0);

  const recommendedNextChapter = useMemo(() => {
    // Pick the weakest subject (lowest completion) that still has a next chapter.
    const candidates = subjectInputs
      .filter((s) => s.nextChapter)
      .sort((a, b) => a.completion - b.completion);
    const pick = candidates[0];
    return pick && pick.nextChapter
      ? { subject: pick, chapter: pick.nextChapter }
      : null;
  }, [subjectInputs]);

  const examCountdownDays = plan?.signals.examCountdownDays ?? null;

  const setTaskStatus = useCallback(
    (taskId: string, status: PlannerTaskStatus) => {
      const updated = updatePlannerTaskStatus(taskId, status);
      if (!updated) return;
      // Roll done minutes back into the plan doc so future reads see it.
      if (plan) {
        const allTasks = readPlannerTasks(userId, planId);
        const newDone = allTasks
          .filter((t) => t.status === "done")
          .reduce((a, t) => a + t.durationMinutes, 0);
        writeStudyPlan({ ...plan, doneMinutes: newDone, updatedAt: Date.now() });
      }
      setTick((n) => n + 1);
    },
    [plan, planId, userId],
  );

  const regenerate = useCallback(() => {
    if (!userId) return;
    const revisions = readRevisionCards(userId);
    const generated = generateDailyPlan({
      userId,
      date,
      subjects: subjectInputs,
      sessions: analytics.recentSessions,
      revisions,
      quizStats: {
        averageScore: quiz.averageScore,
        weakTopics: quiz.weakTopics,
        bySubject: quiz.bySubject,
      },
      streak: analytics.streak,
      availableMinutes: opts.availableMinutes,
      exams: opts.exams,
    });
    const now = Date.now();
    writeStudyPlan({ ...generated.plan, createdAt: now, updatedAt: now });
    writePlannerTasks(
      generated.tasks.map((t) => ({ ...t, createdAt: now, completedAt: null })),
    );
    setTick((n) => n + 1);
  }, [userId, date, subjectInputs, analytics.recentSessions, analytics.streak, quiz.averageScore, quiz.weakTopics, quiz.bySubject, opts.availableMinutes, opts.exams]);

  const trackChapterCompletion = useCallback(
    (input: { subjectId: string; chapterId: string; chapterTitle?: string }) => {
      if (!userId) return;
      const card = seedRevisionCard({ userId, ...input });
      upsertRevisionCard(card);
      setTick((n) => n + 1);
    },
    [userId],
  );

  const reviewRevision = useCallback(
    (cardId: string, quality: number): RevisionScheduleDoc | null => {
      const cards = readRevisionCards(userId);
      const card = cards.find((c) => c.id === cardId);
      if (!card) return null;
      const next = scheduleNextReview(card, quality);
      const updated: RevisionScheduleDoc = {
        ...card,
        ...next,
        updatedAt: Date.now(),
      };
      upsertRevisionCard(updated);
      setTick((n) => n + 1);
      return updated;
    },
    [userId],
  );

  return {
    userId,
    loading,
    plan,
    tasks,
    completionPercent,
    doneMinutes,
    targetMinutes,
    revisions: { ...revisionsBucket, all: revisionsAll },
    weakSubjects,
    recommendedNextChapter,
    examCountdownDays,
    rationale: plan?.rationale ?? [],
    setTaskStatus,
    regenerate,
    trackChapterCompletion,
    reviewRevision,
  };
}