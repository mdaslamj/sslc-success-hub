/**
 * Quiz player controller. Owns: current question index, per-question answers,
 * elapsed time (pause-aware), and submission. Pure UI consumers wire up
 * buttons; the engine handles scoring.
 *
 * Designed to plug into future modes without changes:
 *  - `mock` / `adaptive` swap the question selection upstream — controller stays the same
 *  - AI-generated quizzes are just a different `QuizDoc.source`
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  QuizAnswer,
  QuizAttemptDoc,
  QuizDoc,
} from "@/integrations/firebase/types";
import { gradeAnswer, summarizeAnswers } from "@/lib/quiz-engine";
import { appendQuizAttempt } from "@/lib/quiz-store";
import { toDayKey } from "@/integrations/firebase/services/analytics";
import { useCurrentUserId } from "./use-current-user";

export type QuizPhase = "idle" | "running" | "paused" | "completed";

export type QuizController = {
  quiz: QuizDoc;
  phase: QuizPhase;
  index: number;
  answers: (QuizAnswer | null)[];
  /** Seconds remaining if timed, otherwise elapsed seconds. */
  timeSeconds: number;
  expired: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  select: (optionIndex: number) => void;
  next: () => void;
  prev: () => void;
  goto: (i: number) => void;
  submit: () => QuizAttemptDoc | null;
  attempt: QuizAttemptDoc | null;
};

export function useQuiz(quiz: QuizDoc): QuizController {
  const userId = useCurrentUserId();
  const [phase, setPhase] = useState<QuizPhase>("idle");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(QuizAnswer | null)[]>(
    () => quiz.questions.map(() => null),
  );
  const [attempt, setAttempt] = useState<QuizAttemptDoc | null>(null);

  // Wall-clock tracking. We accumulate runtime in `elapsedRef` and add
  // (now - startedAt) only while `phase === "running"` so pause is exact.
  const startedAtRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0); // ms accumulated across run segments
  const questionStartRef = useRef<number>(0);
  const [tick, setTick] = useState(0);

  // 1 Hz ticker while running drives the visible timer.
  useEffect(() => {
    if (phase !== "running") return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  const elapsedMs = useCallback(() => {
    const live = phase === "running" ? Date.now() - startedAtRef.current : 0;
    return elapsedRef.current + live;
  }, [phase]);

  const timeSeconds = useMemo(() => {
    void tick; // re-eval each tick
    const elapsed = Math.floor(elapsedMs() / 1000);
    if (quiz.durationSeconds > 0) {
      return Math.max(0, quiz.durationSeconds - elapsed);
    }
    return elapsed;
  }, [tick, elapsedMs, quiz.durationSeconds]);

  const expired = quiz.durationSeconds > 0 && timeSeconds === 0 && phase !== "idle";

  const start = useCallback(() => {
    if (phase === "running") return;
    startedAtRef.current = Date.now();
    questionStartRef.current = Date.now();
    if (phase === "idle") elapsedRef.current = 0;
    setPhase("running");
  }, [phase]);

  const pause = useCallback(() => {
    if (phase !== "running") return;
    elapsedRef.current += Date.now() - startedAtRef.current;
    setPhase("paused");
  }, [phase]);

  const resume = useCallback(() => {
    if (phase !== "paused") return;
    startedAtRef.current = Date.now();
    questionStartRef.current = Date.now();
    setPhase("running");
  }, [phase]);

  const select = useCallback(
    (optionIndex: number) => {
      if (phase !== "running") return;
      const q = quiz.questions[index];
      const timeMs = Date.now() - questionStartRef.current;
      const graded = gradeAnswer(q, optionIndex, timeMs);
      setAnswers((prev) => {
        const next = prev.slice();
        next[index] = graded;
        return next;
      });
    },
    [phase, quiz.questions, index],
  );

  const goto = useCallback(
    (i: number) => {
      if (i < 0 || i >= quiz.questions.length) return;
      questionStartRef.current = Date.now();
      setIndex(i);
    },
    [quiz.questions.length],
  );

  const next = useCallback(() => goto(index + 1), [goto, index]);
  const prev = useCallback(() => goto(index - 1), [goto, index]);

  const submit = useCallback((): QuizAttemptDoc | null => {
    if (phase === "completed" || attempt) return attempt;
    // Capture final elapsed before flipping phase.
    if (phase === "running") {
      elapsedRef.current += Date.now() - startedAtRef.current;
    }
    const filled: QuizAnswer[] = quiz.questions.map((q, i) => {
      const a = answers[i];
      return a ?? gradeAnswer(q, null);
    });
    const result = summarizeAnswers(quiz.questions, filled);
    const endedAt = Date.now();
    const startedAt = endedAt - elapsedRef.current;
    const doc = appendQuizAttempt({
      userId,
      quizId: quiz.id,
      subjectId: quiz.subjectId,
      chapterId: quiz.chapterId,
      mode: quiz.mode,
      startedAt,
      endedAt,
      durationSeconds: Math.round(elapsedRef.current / 1000),
      score: result.score,
      total: result.total,
      accuracy: result.accuracy,
      completion: result.completion,
      weakTopics: result.weakTopics,
      answers: filled,
      xpAwarded: result.xpAwarded,
      dayKey: toDayKey(endedAt),
    });
    setAttempt(doc);
    setPhase("completed");
    return doc;
  }, [answers, attempt, phase, quiz, userId]);

  // Auto-submit on timer expiry.
  useEffect(() => {
    if (expired && phase !== "completed") submit();
  }, [expired, phase, submit]);

  return {
    quiz,
    phase,
    index,
    answers,
    timeSeconds,
    expired,
    start,
    pause,
    resume,
    select,
    next,
    prev,
    goto,
    submit,
    attempt,
  };
}