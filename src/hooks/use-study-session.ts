/**
 * Orchestrates the full Study Session Experience:
 *   - loads the target task from today's plan (Firestore for signed-in
 *     users, localStorage for guests)
 *   - drives a pomodoro state machine (focus / short break / long break)
 *   - tracks pause/resume + completed cycles
 *   - exposes AI coach cues + on-demand hint requests
 *   - on completion: logs studySession + sessionResult + sessionFeedback,
 *     reviews the SM-2 revision card, fires a revisionTrigger audit row,
 *     and toggles the task done on the daily plan
 *
 * Stateful but UI-free — `/routes/session.tsx` consumes this hook.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  dailyDocId,
  dayKeyFor,
  localDaily,
  planCompletion,
  planTotalMinutes,
} from "@/lib/daily-engine";
import type {
  DailyPlanDoc,
  DailyTask,
  RevisionTriggerDoc,
  SessionFeedbackDoc,
  SessionResultDoc,
} from "@/integrations/firebase/types";
import {
  fetchDailyPlan,
  upsertDailyPlan,
} from "@/integrations/firebase/services/daily-plans";
import { logStudySession } from "@/integrations/firebase/services/study-sessions";
import { upsertSessionResult } from "@/integrations/firebase/services/session-results";
import { upsertSessionFeedback } from "@/integrations/firebase/services/session-feedback";
import { logRevisionTrigger } from "@/integrations/firebase/services/revision-triggers";
import { upsertRevisionSchedule } from "@/integrations/firebase/services/revision-schedules";
import {
  computeReward,
  confidenceToQuality,
  fetchCoachCue,
  fetchCoachHint,
  nextPhase,
  phaseDuration,
  planCadence,
  reviewCard,
  type CoachCue,
  type CoachHint,
  type PomodoroPhase,
} from "@/lib/study-session";

export type SessionStage = "setup" | "active" | "paused" | "review" | "done";

export type UseStudySessionInput = {
  taskId: string;
  daysToExam: number;
  streakDays: number;
};

export function useStudySession({ taskId, daysToExam, streakDays }: UseStudySessionInput) {
  const { user } = useAuth();
  const userId = user?.uid ?? "guest";
  const todayKey = useMemo(() => dayKeyFor(), []);

  const [plan, setPlan] = useState<DailyPlanDoc | null>(null);
  const [loading, setLoading] = useState(true);

  const [stage, setStage] = useState<SessionStage>("setup");
  const [phase, setPhase] = useState<PomodoroPhase>("focus");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [focusedSeconds, setFocusedSeconds] = useState(0);
  const [pomodoros, setPomodoros] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [coachCue, setCoachCue] = useState<CoachCue | null>(null);
  const [coachHint, setCoachHint] = useState<CoachHint | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [hintLoading, setHintLoading] = useState(false);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number | null>(null);

  const task = useMemo<DailyTask | null>(
    () => plan?.tasks.find((t) => t.id === taskId) ?? null,
    [plan, taskId],
  );

  const cadence = useMemo(
    () => planCadence(task?.durationMin ?? 25),
    [task?.durationMin],
  );

  // ---------- Load today's plan ----------
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      let p: DailyPlanDoc | null = null;
      if (user) {
        try {
          p = await fetchDailyPlan(user.uid, todayKey);
        } catch {
          /* offline */
        }
      }
      if (!p) p = localDaily.getPlan(todayKey);
      if (cancelled) return;
      setPlan(p);
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, todayKey]);

  // ---------- Pomodoro ticking ----------
  useEffect(() => {
    if (stage !== "active") return;
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          // Phase complete — transition.
          if (phase === "focus") {
            setPomodoros((n) => n + 1);
            const np = nextPhase("focus", pomodoros + 1, cadence);
            const total = phaseDuration(np, cadence) * 60;
            // Stop after the last focus block — wait for explicit review.
            if (pomodoros + 1 >= cadence.totalFocusBlocks) {
              setStage("review");
              return 0;
            }
            setPhase(np);
            return total;
          }
          // break finished — back to focus
          const np = nextPhase(phase, pomodoros, cadence);
          setPhase(np);
          return phaseDuration(np, cadence) * 60;
        }
        if (phase === "focus") setFocusedSeconds((f) => f + 1);
        return s - 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [stage, phase, cadence, pomodoros]);

  // ---------- Controls ----------
  const start = useCallback(() => {
    if (!task) return;
    if (!startedAtRef.current) startedAtRef.current = Date.now();
    setPhase("focus");
    setSecondsLeft(phaseDuration("focus", cadence) * 60);
    setStage("active");
    if (user) {
      setCoachLoading(true);
      void fetchCoachCue(user, task, daysToExam)
        .then((cue) => cue && setCoachCue(cue))
        .finally(() => setCoachLoading(false));
    }
  }, [task, cadence, user, daysToExam]);

  const togglePause = useCallback(() => {
    setStage((s) => (s === "active" ? "paused" : s === "paused" ? "active" : s));
  }, []);

  const skipPhase = useCallback(() => {
    setSecondsLeft(1);
  }, []);

  const requestHint = useCallback(
    async (problemContext: string) => {
      if (!task) return;
      setHintLoading(true);
      const h = await fetchCoachHint(user, task, problemContext);
      if (h) {
        setCoachHint(h);
        setHintsUsed((n) => n + 1);
      }
      setHintLoading(false);
    },
    [task, user],
  );

  const endEarly = useCallback(() => {
    setStage("review");
    if (tickRef.current) clearInterval(tickRef.current);
  }, []);

  // ---------- Completion ----------
  const complete = useCallback(
    async ({
      confidence,
      difficulty,
      note,
    }: {
      confidence: number;
      difficulty: number;
      note?: string;
    }) => {
      if (!task) return;
      const startedAt = startedAtRef.current ?? Date.now() - focusedSeconds * 1000;
      const endedAt = Date.now();
      const focusedMinutes = Math.max(1, Math.round(focusedSeconds / 60));
      const completed = pomodoros >= cadence.totalFocusBlocks;
      const reward = computeReward({
        focusedMinutes,
        pomodorosCompleted: pomodoros,
        confidence,
        difficulty,
        streakDays,
        completed,
      });

      let sessionId = `local_${Date.now()}`;

      if (user) {
        try {
          const sess = await logStudySession({
            userId: user.uid,
            kind:
              task.kind === "revision"
                ? "revision"
                : task.kind === "weak_drill" || task.kind === "recovery"
                  ? "chapter"
                  : "focus",
            startedAt,
            endedAt,
            durationMinutes: focusedMinutes,
            dayKey: todayKey,
            subjectId: task.subjectId,
            chapterId: task.chapterId,
            notes: note || task.title,
          });
          sessionId = sess.id;

          const result: SessionResultDoc = {
            id: sessionId,
            userId: user.uid,
            sessionId,
            dayKey: todayKey,
            taskId: task.id,
            taskKind: task.kind,
            subjectId: task.subjectId,
            chapterId: task.chapterId,
            plannedMinutes: task.durationMin,
            focusedMinutes,
            xpAwarded: reward.xpAwarded,
            masteryDelta: reward.masteryDelta,
            pomodorosCompleted: pomodoros,
            completed,
            createdAt: Date.now(),
          };
          await upsertSessionResult(result);

          const feedback: SessionFeedbackDoc = {
            id: sessionId,
            userId: user.uid,
            sessionId,
            confidence,
            difficulty,
            hintsUsed,
            note,
            createdAt: Date.now(),
          };
          await upsertSessionFeedback(feedback);

          // Schedule next revision via SM-2.
          if (task.chapterId && task.subjectId) {
            const quality = confidenceToQuality(confidence, difficulty);
            const card = reviewCard(null, quality);
            const cardId = `${user.uid}_${task.chapterId}`;
            await upsertRevisionSchedule({
              id: cardId,
              userId: user.uid,
              subjectId: task.subjectId,
              chapterId: task.chapterId,
              chapterTitle: task.title,
              reps: card.reps,
              ease: card.ease,
              intervalDays: card.intervalDays,
              dueAt: card.nextDueAt,
              lastReviewedAt: Date.now(),
              lastQuality: quality,
              lapses: card.lapses,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
            const trigger: Omit<RevisionTriggerDoc, "id"> = {
              userId: user.uid,
              sessionId,
              subjectId: task.subjectId,
              chapterId: task.chapterId,
              reason:
                confidence <= 2
                  ? "low_confidence"
                  : reward.masteryDelta >= 4
                    ? "mastery_jump"
                    : "session_complete",
              quality,
              nextDueAt: card.nextDueAt,
              intervalDays: card.intervalDays,
              createdAt: Date.now(),
            };
            await logRevisionTrigger(trigger);
          }
        } catch {
          /* offline — keep client state and fall through */
        }
      }

      // Mark task done on the daily plan.
      if (plan) {
        const tasks = plan.tasks.map((t) =>
          t.id === task.id ? { ...t, done: true, completedAt: Date.now() } : t,
        );
        const next: DailyPlanDoc = {
          ...plan,
          tasks,
          completionScore: planCompletion(tasks),
          totalMinutes: planTotalMinutes(tasks),
          updatedAt: Date.now(),
        };
        setPlan(next);
        if (user) {
          try {
            await upsertDailyPlan({
              ...next,
              userId: user.uid,
              id: dailyDocId(user.uid, todayKey),
            });
          } catch {
            localDaily.setPlan(next);
          }
        } else {
          localDaily.setPlan(next);
        }
      }

      setStage("done");
      return { sessionId, reward, completed };
    },
    [task, plan, user, todayKey, focusedSeconds, pomodoros, cadence, hintsUsed, streakDays],
  );

  return {
    loading,
    plan,
    task,
    stage,
    phase,
    cadence,
    secondsLeft,
    focusedSeconds,
    pomodoros,
    hintsUsed,
    coachCue,
    coachHint,
    coachLoading,
    hintLoading,
    start,
    togglePause,
    skipPhase,
    endEarly,
    requestHint,
    complete,
  };
}