import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  MockExamAnswer,
  MockExamAttemptDoc,
  MockExamDoc,
  MockExamResultDoc,
} from "@/integrations/firebase/types";
import {
  blankAnswers,
  buildExamResult,
  gradeAttempt,
} from "@/lib/mock-exam-engine";
import {
  cacheAttempt,
  cacheResult,
  readActiveAttemptId,
  readCachedAttempt,
} from "@/lib/mock-exam-store";
import { useCurrentUserId } from "@/hooks/use-current-user";
import {
  saveExamAttemptProgress,
  saveExamResult,
  startExamAttempt,
} from "@/integrations/firebase/services/mock-exams";

export type ExamPhase = "idle" | "running" | "submitted";

/**
 * Mock exam player state machine. Handles cursor navigation, mark-for-review,
 * negative-marking-aware grading, auto-submit on timeout, and periodic
 * persistence (localStorage every change, Firestore every ~5s).
 */
export function useMockExam(exam: MockExamDoc) {
  const userId = useCurrentUserId();
  const [attempt, setAttempt] = useState<MockExamAttemptDoc | null>(null);
  const [phase, setPhase] = useState<ExamPhase>("idle");
  const [now, setNow] = useState(() => Date.now());
  const [result, setResult] = useState<MockExamResultDoc | null>(null);
  const tickRef = useRef<number | null>(null);
  const saveRef = useRef<number | null>(null);
  const dirtyRef = useRef(false);

  // ---- resume or create attempt -------------------------------------------
  useEffect(() => {
    const activeId = readActiveAttemptId(exam.id);
    if (activeId) {
      const cached = readCachedAttempt(activeId);
      if (cached && cached.status === "in_progress") {
        setAttempt(cached);
        setPhase("running");
        return;
      }
    }
    // Create a brand new attempt.
    const startedAt = Date.now();
    const a: MockExamAttemptDoc = {
      id: `local_${startedAt}_${Math.random().toString(36).slice(2, 8)}`,
      userId,
      examId: exam.id,
      kind: exam.kind,
      status: "in_progress",
      startedAt,
      deadlineAt: startedAt + exam.durationSeconds * 1000,
      durationSeconds: 0,
      answers: blankAnswers(exam),
      cursor: 0,
      updatedAt: startedAt,
    };
    cacheAttempt(a);
    setAttempt(a);
    setPhase("running");
    // Best-effort Firestore mirror (non-blocking).
    void startExamAttempt({ ...a, id: undefined as unknown as string } as never)
      .then((doc) => {
        // Swap in the Firestore id so future saves patch the right doc.
        const next = { ...a, id: doc.id };
        cacheAttempt(next);
        setAttempt(next);
      })
      .catch(() => {
        /* offline / not signed in — local cache is the source of truth */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam.id]);

  // ---- ticking + auto-submit ----------------------------------------------
  useEffect(() => {
    if (phase !== "running") return;
    tickRef.current = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [phase]);

  const secondsLeft = useMemo(() => {
    if (!attempt) return exam.durationSeconds;
    return Math.max(0, Math.round((attempt.deadlineAt - now) / 1000));
  }, [attempt, exam.durationSeconds, now]);

  // ---- debounced persistence ----------------------------------------------
  useEffect(() => {
    if (!attempt || phase !== "running") return;
    saveRef.current = window.setInterval(() => {
      if (!dirtyRef.current) return;
      dirtyRef.current = false;
      void saveExamAttemptProgress(attempt.id, {
        answers: attempt.answers,
        cursor: attempt.cursor,
      }).catch(() => {});
    }, 5000);
    return () => {
      if (saveRef.current) window.clearInterval(saveRef.current);
    };
  }, [attempt, phase]);

  // ---- mutations ----------------------------------------------------------
  const update = useCallback(
    (patch: Partial<MockExamAttemptDoc>) => {
      setAttempt((a) => {
        if (!a) return a;
        const next = { ...a, ...patch, updatedAt: Date.now() };
        cacheAttempt(next);
        dirtyRef.current = true;
        return next;
      });
    },
    [],
  );

  const select = useCallback(
    (qIndex: number, optionIndex: number) => {
      setAttempt((a) => {
        if (!a) return a;
        const answers = a.answers.slice();
        const current = answers[qIndex] ?? {
          mcqId: exam.questions[qIndex].mcqId,
          selectedIndex: null,
          marked: false,
          correct: null,
          marksEarned: 0,
        };
        answers[qIndex] = { ...current, selectedIndex: optionIndex };
        const next = { ...a, answers, updatedAt: Date.now() };
        cacheAttempt(next);
        dirtyRef.current = true;
        return next;
      });
    },
    [exam.questions],
  );

  const clear = useCallback((qIndex: number) => {
    setAttempt((a) => {
      if (!a) return a;
      const answers = a.answers.slice();
      answers[qIndex] = { ...answers[qIndex], selectedIndex: null };
      const next = { ...a, answers, updatedAt: Date.now() };
      cacheAttempt(next);
      dirtyRef.current = true;
      return next;
    });
  }, []);

  const toggleMark = useCallback((qIndex: number) => {
    setAttempt((a) => {
      if (!a) return a;
      const answers = a.answers.slice();
      answers[qIndex] = { ...answers[qIndex], marked: !answers[qIndex]?.marked };
      const next = { ...a, answers, updatedAt: Date.now() };
      cacheAttempt(next);
      dirtyRef.current = true;
      return next;
    });
  }, []);

  const setCursor = useCallback(
    (i: number) => {
      if (i < 0 || i >= exam.questions.length) return;
      update({ cursor: i });
    },
    [exam.questions.length, update],
  );

  const next = useCallback(() => {
    if (!attempt) return;
    setCursor(Math.min(attempt.cursor + 1, exam.questions.length - 1));
  }, [attempt, exam.questions.length, setCursor]);

  const prev = useCallback(() => {
    if (!attempt) return;
    setCursor(Math.max(attempt.cursor - 1, 0));
  }, [attempt, setCursor]);

  // ---- submit -------------------------------------------------------------
  const submit = useCallback(
    (reason: "manual" | "timeout" = "manual"): MockExamResultDoc | null => {
      if (!attempt) return null;
      const endedAt = Date.now();
      const graded: MockExamAnswer[] = gradeAttempt(exam, attempt.answers);
      const finished: MockExamAttemptDoc = {
        ...attempt,
        answers: graded,
        status: "submitted",
        endedAt,
        durationSeconds: Math.round((endedAt - attempt.startedAt) / 1000),
      };
      const res = buildExamResult({
        attempt: finished,
        exam,
        graded,
        endedAt,
        userId,
      });
      cacheAttempt(finished);
      cacheResult(res);
      setAttempt(finished);
      setResult(res);
      setPhase("submitted");

      // Mirror to Firestore best-effort.
      void saveExamAttemptProgress(finished.id, {
        answers: finished.answers,
        cursor: finished.cursor,
        status: "submitted",
        endedAt,
      }).catch(() => {});
      void saveExamResult(res).catch(() => {});

      // Surface the submit reason via console so analytics can correlate.
      if (reason === "timeout") console.info("[exam] auto-submitted on timeout");
      return res;
    },
    [attempt, exam, userId],
  );

  // Auto-submit when timer hits zero.
  useEffect(() => {
    if (phase === "running" && secondsLeft <= 0) {
      submit("timeout");
    }
  }, [phase, secondsLeft, submit]);

  return {
    attempt,
    phase,
    result,
    secondsLeft,
    cursor: attempt?.cursor ?? 0,
    answers: attempt?.answers ?? [],
    select,
    clear,
    toggleMark,
    setCursor,
    next,
    prev,
    submit,
  };
}