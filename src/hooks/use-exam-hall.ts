import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createHallSession,
  fetchHallSession,
  fetchSimulationResultForSession,
  listHallSessions,
  listInvigilatorEvents,
  pushInvigilatorEvent,
  saveHallSession,
  saveExamStrategy,
  saveSimulationResult,
  saveStressPattern,
  saveTimingAnalytics,
} from "@/integrations/firebase/services/exam-hall";
import {
  buildSimulationResult,
  buildTimingAnalytics,
  defaultHallBlueprint,
  detectInvigilatorEvents,
  buildExamStrategy,
  summarizeStress,
} from "@/lib/exam-hall";
import {
  localGetResult,
  localGetSession,
  localListEvents,
  localListSessions,
  localPushEvent,
  localSaveResult,
  localUpsertSession,
} from "@/lib/exam-hall/local-store";
import { useCurrentUser } from "@/hooks/use-current-user";
import type {
  BoardSimulationResultDoc,
  ExamHallAnswer,
  ExamHallSection,
  ExamHallSessionDoc,
  InvigilatorEventDoc,
} from "@/integrations/firebase/types";

const HEARTBEAT_MS = 5000;

function newId() {
  return `local-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
}

function emptyAnswer(qid: string): ExamHallAnswer {
  return { questionId: qid, text: "", timeSpentSec: 0, visits: 0, hesitations: 0 };
}

function blankSession(args: {
  userId: string;
  sections: ExamHallSection[];
  totalMarks: number;
  totalDurationSec: number;
  title: string;
  examId?: string;
}): ExamHallSessionDoc {
  const now = Date.now();
  const answers: Record<string, ExamHallAnswer> = {};
  args.sections.forEach((s) =>
    s.questions.forEach((q) => {
      answers[q.id] = emptyAnswer(q.id);
    }),
  );
  return {
    id: newId(),
    userId: args.userId,
    title: args.title,
    examId: args.examId,
    totalMarks: args.totalMarks,
    totalDurationSec: args.totalDurationSec,
    startedAt: now,
    status: "in_progress",
    sections: args.sections,
    answers,
    cursor: { sectionIndex: 0, questionIndex: 0 },
    elapsedSec: 0,
    antiCheat: { blurEvents: 0, fullscreenExits: 0, pasteEvents: 0 },
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Master hook for the Exam Hall experience. Handles:
 *  - session lifecycle (start, persist, pause, submit)
 *  - per-question timing + heartbeat
 *  - AI invigilator polling
 *  - anti-cheat counters (blur / paste / fullscreen exit)
 *  - post-exam analysis (timing, stress, simulation result)
 *
 * Falls back to localStorage when the user is not signed in.
 */
export function useExamHall(sessionId?: string) {
  const { user } = useCurrentUser();
  const isGuest = !user?.uid;
  const uid = user?.uid ?? "guest";

  const [session, setSession] = useState<ExamHallSessionDoc | null>(null);
  const [events, setEvents] = useState<InvigilatorEventDoc[]>([]);
  const [result, setResult] = useState<BoardSimulationResultDoc | null>(null);
  const [loading, setLoading] = useState(!!sessionId);

  const tickRef = useRef<number | null>(null);

  // ----- load existing session -------------------------------------------------
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      let s: ExamHallSessionDoc | null = null;
      if (isGuest) {
        s = localGetSession(sessionId) ?? null;
      } else {
        s = await fetchHallSession(uid, sessionId).catch(() => null);
        if (!s) s = localGetSession(sessionId) ?? null;
      }
      if (cancelled) return;
      setSession(s);
      const evs = isGuest
        ? localListEvents(sessionId)
        : await listInvigilatorEvents(uid, sessionId).catch(() => []);
      if (!cancelled) setEvents(evs);
      const res = isGuest
        ? localGetResult(sessionId) ?? null
        : await fetchSimulationResultForSession(uid, sessionId).catch(() => null);
      if (!cancelled) setResult(res ?? localGetResult(sessionId) ?? null);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, uid, isGuest]);

  const persist = useCallback(
    async (next: ExamHallSessionDoc) => {
      localUpsertSession(next);
      if (!isGuest) {
        await saveHallSession(next).catch(() => {});
      }
    },
    [isGuest],
  );

  // ----- create new ------------------------------------------------------------
  const startSession = useCallback(
    async (opts?: {
      sections?: ExamHallSection[];
      title?: string;
      examId?: string;
    }) => {
      const blueprint = opts?.sections
        ? {
            sections: opts.sections,
            totalMarks: opts.sections.reduce(
              (s, sec) => s + sec.questions.reduce((a, q) => a + q.marks, 0),
              0,
            ),
            totalDurationSec: opts.sections.reduce((s, sec) => s + sec.durationSec, 0),
          }
        : defaultHallBlueprint();
      const draft = blankSession({
        userId: uid,
        sections: blueprint.sections,
        totalMarks: blueprint.totalMarks,
        totalDurationSec: blueprint.totalDurationSec,
        title: opts?.title ?? "SSLC Board Simulation",
        examId: opts?.examId,
      });
      let created: ExamHallSessionDoc = draft;
      if (!isGuest) {
        const persisted = await createHallSession(draft).catch(() => null);
        if (persisted) created = persisted;
      }
      localUpsertSession(created);
      // Build + save the adaptive strategy.
      const strategy = buildExamStrategy({
        userId: uid,
        sessionId: created.id,
        sections: created.sections,
        totalDurationSec: created.totalDurationSec,
      });
      if (!isGuest) {
        saveExamStrategy(strategy).catch(() => {});
      }
      setSession(created);
      return created;
    },
    [uid, isGuest],
  );

  // ----- live editing ----------------------------------------------------------
  const updateAnswer = useCallback(
    (questionId: string, text: string) => {
      setSession((prev) => {
        if (!prev || prev.status !== "in_progress") return prev;
        const existing = prev.answers[questionId] ?? emptyAnswer(questionId);
        const lengthDelta = Math.abs(text.length - (existing.text?.length ?? 0));
        const hesitations = existing.hesitations + (lengthDelta === 0 ? 1 : 0);
        const next: ExamHallSessionDoc = {
          ...prev,
          answers: {
            ...prev.answers,
            [questionId]: {
              ...existing,
              text,
              hesitations,
              lastTouchedAt: Date.now(),
            },
          },
          updatedAt: Date.now(),
        };
        void persist(next);
        return next;
      });
    },
    [persist],
  );

  const goTo = useCallback(
    (sectionIndex: number, questionIndex: number) => {
      setSession((prev) => {
        if (!prev) return prev;
        const sec = prev.sections[sectionIndex];
        if (!sec) return prev;
        const q = sec.questions[questionIndex];
        if (!q) return prev;
        const ans = prev.answers[q.id] ?? emptyAnswer(q.id);
        const next: ExamHallSessionDoc = {
          ...prev,
          cursor: { sectionIndex, questionIndex },
          answers: {
            ...prev.answers,
            [q.id]: {
              ...ans,
              visits: (ans.visits ?? 0) + 1,
              startedAt: ans.startedAt ?? Date.now(),
            },
          },
          updatedAt: Date.now(),
        };
        void persist(next);
        return next;
      });
    },
    [persist],
  );

  const flagCurrent = useCallback(
    (flagged: boolean) => {
      setSession((prev) => {
        if (!prev) return prev;
        const sec = prev.sections[prev.cursor.sectionIndex];
        const q = sec?.questions[prev.cursor.questionIndex];
        if (!q) return prev;
        const ans = prev.answers[q.id] ?? emptyAnswer(q.id);
        const next: ExamHallSessionDoc = {
          ...prev,
          answers: { ...prev.answers, [q.id]: { ...ans, flagged } },
          updatedAt: Date.now(),
        };
        void persist(next);
        return next;
      });
    },
    [persist],
  );

  const bumpAntiCheat = useCallback(
    (kind: "blurEvents" | "fullscreenExits" | "pasteEvents") => {
      setSession((prev) => {
        if (!prev) return prev;
        const ac = prev.antiCheat ?? {
          blurEvents: 0,
          fullscreenExits: 0,
          pasteEvents: 0,
        };
        const next: ExamHallSessionDoc = {
          ...prev,
          antiCheat: { ...ac, [kind]: (ac[kind] ?? 0) + 1 },
          updatedAt: Date.now(),
        };
        void persist(next);
        return next;
      });
    },
    [persist],
  );

  // ----- heartbeat: tick time + run invigilator --------------------------------
  useEffect(() => {
    if (!session || session.status !== "in_progress") return;
    tickRef.current = window.setInterval(() => {
      setSession((prev) => {
        if (!prev || prev.status !== "in_progress") return prev;
        const sec = prev.sections[prev.cursor.sectionIndex];
        const q = sec?.questions[prev.cursor.questionIndex];
        const elapsedSec = prev.elapsedSec + Math.round(HEARTBEAT_MS / 1000);
        const answers = q
          ? {
              ...prev.answers,
              [q.id]: {
                ...(prev.answers[q.id] ?? emptyAnswer(q.id)),
                timeSpentSec:
                  (prev.answers[q.id]?.timeSpentSec ?? 0) +
                  Math.round(HEARTBEAT_MS / 1000),
              },
            }
          : prev.answers;
        const next: ExamHallSessionDoc = { ...prev, elapsedSec, answers };

        // Auto-submit when full duration consumed.
        if (elapsedSec >= prev.totalDurationSec) {
          next.status = "auto_submitted";
          next.endedAt = Date.now();
        }

        // AI invigilator detection.
        const drafts = detectInvigilatorEvents(next);
        if (drafts.length > 0) {
          drafts.forEach((d) => {
            const evt: InvigilatorEventDoc = {
              ...d,
              id: newId(),
            } as InvigilatorEventDoc;
            setEvents((e) =>
              e.some(
                (x) =>
                  x.kind === evt.kind &&
                  x.sectionId === evt.sectionId &&
                  Date.now() - x.createdAt < 60_000,
              )
                ? e
                : [...e, evt],
            );
            localPushEvent(evt);
            if (!isGuest) pushInvigilatorEvent(d).catch(() => {});
          });
        }

        void persist(next);
        return next;
      });
    }, HEARTBEAT_MS);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [session?.id, session?.status, isGuest, persist]);

  // ----- submission + analysis -------------------------------------------------
  const submit = useCallback(async () => {
    let final: ExamHallSessionDoc | null = null;
    setSession((prev) => {
      if (!prev) return prev;
      final = { ...prev, status: "submitted", endedAt: Date.now() };
      void persist(final);
      return final;
    });
    if (!final) return null;
    const timing = buildTimingAnalytics(final);
    const stress = summarizeStress({ session: final, events });
    const sim = buildSimulationResult({ session: final, events, timing });
    localSaveResult({ ...sim, id: newId() } as BoardSimulationResultDoc);
    if (!isGuest) {
      await Promise.all([
        saveTimingAnalytics(timing).catch(() => {}),
        saveStressPattern(stress).catch(() => {}),
        saveSimulationResult(sim).catch(() => {}),
      ]);
    }
    const stored: BoardSimulationResultDoc = {
      ...sim,
      id: newId(),
    } as BoardSimulationResultDoc;
    setResult(stored);
    return stored;
  }, [events, isGuest, persist]);

  const remainingSec = useMemo(() => {
    if (!session) return 0;
    return Math.max(0, session.totalDurationSec - session.elapsedSec);
  }, [session]);

  return {
    isGuest,
    loading,
    session,
    events,
    result,
    remainingSec,
    startSession,
    updateAnswer,
    goTo,
    flagCurrent,
    bumpAntiCheat,
    submit,
  };
}

/**
 * Lightweight list hook for the exam hall index page.
 */
export function useExamHallList() {
  const { user } = useCurrentUser();
  const [list, setList] = useState<ExamHallSessionDoc[]>(() =>
    localListSessions(),
  );
  useEffect(() => {
    if (!user?.uid) return;
    listHallSessions(user.uid)
      .then((remote) => {
        if (remote.length > 0) setList(remote);
      })
      .catch(() => {});
  }, [user?.uid]);
  return list;
}