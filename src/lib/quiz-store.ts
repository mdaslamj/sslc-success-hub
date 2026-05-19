/**
 * Local-first quiz attempt store. Mirrors the Firestore service interface
 * (see `services/quiz-attempts.ts`) so call sites stay stable once Firebase
 * Auth is wired and writes fan out to Firestore.
 */

import type { QuizAttemptDoc, QuizDoc } from "@/integrations/firebase/types";

const ATTEMPTS_KEY = "vidyapath.quiz.attempts.v1";
const QUIZZES_KEY = "vidyapath.quiz.cache.v1";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / SSR / private mode — silently drop */
  }
}

// ---------- Attempts ----------

export function readQuizAttempts(userId: string): QuizAttemptDoc[] {
  if (typeof window === "undefined") return [];
  const all = safeParse<QuizAttemptDoc[]>(localStorage.getItem(ATTEMPTS_KEY), []);
  return all.filter((a) => a.userId === userId);
}

export function appendQuizAttempt(input: Omit<QuizAttemptDoc, "id">): QuizAttemptDoc {
  const doc: QuizAttemptDoc = {
    ...input,
    id: `qa_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
  };
  if (typeof window !== "undefined") {
    const all = safeParse<QuizAttemptDoc[]>(localStorage.getItem(ATTEMPTS_KEY), []);
    all.push(doc);
    // Cap to last 500 attempts to bound localStorage growth.
    safeWrite(ATTEMPTS_KEY, all.slice(-500));
  }
  return doc;
}

// ---------- Quiz definitions (cache of generated quizzes) ----------

/** Cache a quiz definition so a refresh on /quiz/:id still renders it. */
export function cacheQuiz(quiz: QuizDoc): QuizDoc {
  if (typeof window !== "undefined") {
    const all = safeParse<Record<string, QuizDoc>>(
      localStorage.getItem(QUIZZES_KEY),
      {},
    );
    all[quiz.id] = quiz;
    safeWrite(QUIZZES_KEY, all);
  }
  return quiz;
}

export function readCachedQuiz(quizId: string): QuizDoc | null {
  if (typeof window === "undefined") return null;
  const all = safeParse<Record<string, QuizDoc>>(
    localStorage.getItem(QUIZZES_KEY),
    {},
  );
  return all[quizId] ?? null;
}