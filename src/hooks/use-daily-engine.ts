/**
 * Orchestrates the Daily AI Study Engine on the client:
 *   - generates today's plan from snapshot inputs (memory tracking, weak
 *     subjects, exam date, board weightage)
 *   - persists to Firestore when signed in, localStorage otherwise
 *   - exposes session, completion and reflection state to UI
 *   - emits motivation events when streaks / milestones change
 *
 * Heuristic AI by default. A signed-in user can call `requestAiCoach()` to
 * upgrade the greeting / priority hint via the existing semantic reasoning
 * server function (no new server endpoint required).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  dayKeyFor,
  dailyDocId,
  generateDailyPlan,
  localDaily,
  planCompletion,
  planTotalMinutes,
  type GeneratorInput,
} from "@/lib/daily-engine";
import type {
  DailyPlanDoc,
  DailyReflectionDoc,
  DailyTask,
  MotivationEventDoc,
} from "@/integrations/firebase/types";
import {
  fetchDailyPlan,
  upsertDailyPlan,
} from "@/integrations/firebase/services/daily-plans";
import {
  fetchDailyReflection,
  saveDailyReflection,
} from "@/integrations/firebase/services/daily-reflections";
import { logMotivationEvent } from "@/integrations/firebase/services/motivation-events";
import { logStudySession } from "@/integrations/firebase/services/study-sessions";
import { runSemanticReasoning } from "@/lib/semantic-reasoning/semantic-reasoning.functions";

export type DailyEngineState = {
  plan: DailyPlanDoc | null;
  reflection: DailyReflectionDoc | null;
  loading: boolean;
  todayKey: string;
  totalMinutes: number;
  completion: number;
  motivation: string;
  /** Currently-running session task id, if any. */
  activeTaskId: string | null;
  activeSeconds: number;
};

function pickMotivationLine(completion: number, daysToExam: number): string {
  if (completion >= 100) return "All done. You showed up — that's the win. 🌿";
  if (completion >= 60) return "Strong rhythm today. Keep it gentle.";
  if (completion >= 1) return "Momentum is building. One block at a time.";
  if (daysToExam <= 14) return "Exam is close — even 20 calm minutes matters.";
  return "Start with the smallest task. Energy follows action.";
}

export function useDailyEngine(input: Omit<GeneratorInput, "dayKey">) {
  const { user } = useAuth();
  const userId = user?.uid ?? "guest";
  const todayKey = useMemo(() => dayKeyFor(), []);
  const [plan, setPlan] = useState<DailyPlanDoc | null>(null);
  const [reflection, setReflection] = useState<DailyReflectionDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeSeconds, setActiveSeconds] = useState(0);
  const startedAtRef = useRef<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---------- Bootstrap: load or generate today's plan ----------
  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      setLoading(true);
      let existing: DailyPlanDoc | null = null;
      let refl: DailyReflectionDoc | null = null;
      if (user) {
        try {
          [existing, refl] = await Promise.all([
            fetchDailyPlan(user.uid, todayKey),
            fetchDailyReflection(user.uid, todayKey),
          ]);
        } catch {
          /* offline — fall back to local */
        }
      }
      if (!existing) existing = localDaily.getPlan(todayKey);
      if (!refl) refl = localDaily.getReflection(todayKey);

      if (!existing) {
        const tasks = generateDailyPlan({ ...input, dayKey: todayKey });
        existing = {
          id: dailyDocId(userId, todayKey),
          userId,
          dayKey: todayKey,
          generatedAt: Date.now(),
          tasks,
          totalMinutes: planTotalMinutes(tasks),
          completionScore: 0,
          updatedAt: Date.now(),
        };
        await persistPlan(existing);
      }

      if (cancelled) return;
      setPlan(existing);
      setReflection(refl);
      setLoading(false);
    }
    void bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, todayKey]);

  async function persistPlan(next: DailyPlanDoc) {
    if (user) {
      try {
        await upsertDailyPlan({ ...next, userId: user.uid, id: dailyDocId(user.uid, next.dayKey) });
      } catch {
        localDaily.setPlan(next);
        return;
      }
    }
    localDaily.setPlan(next);
  }

  // ---------- Task completion ----------
  const toggleTask = useCallback(
    async (taskId: string) => {
      setPlan((prev) => {
        if (!prev) return prev;
        const tasks = prev.tasks.map((t) =>
          t.id === taskId
            ? { ...t, done: !t.done, completedAt: !t.done ? Date.now() : undefined }
            : t,
        );
        const completion = planCompletion(tasks);
        const next: DailyPlanDoc = {
          ...prev,
          tasks,
          completionScore: completion,
          updatedAt: Date.now(),
        };
        void persistPlan(next);
        if (completion === 100 && prev.completionScore < 100) {
          void emitMotivation("daily_complete", "Day complete — your plan is closed. 🌟", 100);
        }
        return next;
      });
    },
    [user?.uid],
  );

  // ---------- Session timer ----------
  const startSession = useCallback((taskId: string) => {
    setActiveTaskId(taskId);
    setActiveSeconds(0);
    startedAtRef.current = Date.now();
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => setActiveSeconds((s) => s + 1), 1000);
  }, []);

  const stopSession = useCallback(
    async (opts: { complete: boolean }) => {
      const taskId = activeTaskId;
      const startedAt = startedAtRef.current;
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      const endedAt = Date.now();
      const minutes = Math.max(1, Math.round(activeSeconds / 60));
      setActiveTaskId(null);
      setActiveSeconds(0);
      startedAtRef.current = null;
      if (!taskId || !startedAt) return;

      // Persist session record when signed in
      if (user) {
        try {
          const task = plan?.tasks.find((t) => t.id === taskId);
          await logStudySession({
            userId: user.uid,
            kind:
              task?.kind === "revision"
                ? "revision"
                : task?.kind === "weak_drill" || task?.kind === "recovery"
                  ? "chapter"
                  : "focus",
            startedAt,
            endedAt,
            durationMinutes: minutes,
            dayKey: todayKey,
            subjectId: task?.subjectId,
            chapterId: task?.chapterId,
            notes: task?.title,
          });
        } catch {
          /* offline */
        }
      }
      if (opts.complete) await toggleTask(taskId);
    },
    [activeTaskId, activeSeconds, user?.uid, plan, todayKey, toggleTask],
  );

  // ---------- Reflection ----------
  const saveReflection = useCallback(
    async (input: {
      confidence: number;
      difficult?: string;
      strugglingChapterIds?: string[];
      studyMinutes: number;
    }) => {
      const doc: DailyReflectionDoc = {
        id: dailyDocId(userId, todayKey),
        userId,
        dayKey: todayKey,
        confidence: input.confidence,
        difficult: input.difficult,
        strugglingChapterIds: input.strugglingChapterIds ?? [],
        completedTaskIds: plan?.tasks.filter((t) => t.done).map((t) => t.id) ?? [],
        studyMinutes: input.studyMinutes,
        createdAt: Date.now(),
      };
      if (user) {
        try {
          await saveDailyReflection(doc);
        } catch {
          /* offline */
        }
      }
      localDaily.setReflection(doc);
      setReflection(doc);
      await emitMotivation(
        input.confidence >= 4 ? "milestone" : "ai_encouragement",
        input.confidence >= 4
          ? "Confidence is climbing — proof your plan is working."
          : "Hard days build the strongest streaks. Rest, then return.",
        input.confidence,
      );
    },
    [userId, user, plan, todayKey],
  );

  // ---------- Motivation events ----------
  async function emitMotivation(
    kind: MotivationEventDoc["kind"],
    message: string,
    value?: number,
  ) {
    const ev: MotivationEventDoc = {
      id: `${userId}_${Date.now()}`,
      userId,
      kind,
      message,
      dayKey: todayKey,
      value,
      createdAt: Date.now(),
    };
    if (user) {
      try {
        await logMotivationEvent({
          userId: ev.userId,
          kind: ev.kind,
          message: ev.message,
          dayKey: ev.dayKey,
          value: ev.value,
          createdAt: ev.createdAt,
        });
      } catch {
        localDaily.pushMotivation(ev);
      }
    } else {
      localDaily.pushMotivation(ev);
    }
  }

  // ---------- Optional AI coach (signed-in users only) ----------
  const requestAiCoach = useCallback(async () => {
    if (!user || !plan) return;
    try {
      const idToken = await user.getIdToken();
      const topTask = plan.tasks[0];
      const summary = plan.tasks
        .slice(0, 5)
        .map((t) => `- ${t.title} (${t.durationMin}m, priority ${t.priority})`)
        .join("\n");
      const res = await runSemanticReasoning({
        data: {
          idToken,
          taskType: "planner-reasoning",
          systemPrompt:
            "You are Aura, a calm, encouraging study coach for an Indian board-exam student. " +
            "Respond ONLY as JSON with keys 'greeting' (one warm sentence, <=18 words) and 'priorityHint' " +
            "(one specific sentence about WHY today's top task matters, <=22 words). No markdown.",
          responseFormat: "json_object",
          temperature: 0.6,
          messages: [
            {
              role: "user",
              content: `Days to exam: ${input.daysToExam}. Top task: ${topTask?.title ?? "—"}.\nPlan:\n${summary}`,
            },
          ],
        },
      });
      if (!res.ok) return;
      try {
        const parsed = JSON.parse(res.content) as {
          greeting?: string;
          priorityHint?: string;
        };
        const next: DailyPlanDoc = {
          ...plan,
          aiGreeting: parsed.greeting,
          aiPriorityHint: parsed.priorityHint,
          updatedAt: Date.now(),
        };
        setPlan(next);
        await persistPlan(next);
      } catch {
        /* model returned non-JSON — keep heuristic copy */
      }
    } catch {
      /* network / token failure — silently keep heuristic copy */
    }
  }, [user, plan, input.daysToExam]);

  const completion = plan ? planCompletion(plan.tasks) : 0;
  const motivation =
    plan?.aiGreeting ?? pickMotivationLine(completion, input.daysToExam);

  return {
    todayKey,
    plan,
    reflection,
    loading,
    completion,
    totalMinutes: plan?.totalMinutes ?? 0,
    motivation,
    aiPriorityHint: plan?.aiPriorityHint,
    activeTaskId,
    activeSeconds,
    toggleTask,
    startSession,
    stopSession,
    saveReflection,
    requestAiCoach,
  };
}