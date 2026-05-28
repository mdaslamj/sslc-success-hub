/**
 * Local cache for active mock exams + finished attempts. Mirrors the
 * `quiz-store` pattern: lets the player work offline / for guests, and
 * carries an attempt across pages (player → result) without a refetch.
 */
import type {
  MockExamAttemptDoc,
  MockExamDoc,
  MockExamResultDoc,
} from "@/integrations/firebase/types";
import { sanitizeMockExam } from "@/lib/mock-exam-validation";

const EXAM_KEY = (id: string) => `exam:exam:${id}`;
const ATTEMPT_KEY = (id: string) => `exam:attempt:${id}`;
const RESULT_KEY = (id: string) => `exam:result:${id}`;
const ACTIVE_KEY = (examId: string) => `exam:active:${examId}`;

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

export function cacheExam(exam: MockExamDoc) {
  const validated = sanitizeMockExam(exam);
  if (!validated.ok) return;
  safe(
    () =>
      localStorage.setItem(
        EXAM_KEY(validated.exam.id),
        JSON.stringify(validated.exam),
      ),
    undefined,
  );
}
export function readCachedExam(id: string): MockExamDoc | null {
  return safe(() => {
    const v = localStorage.getItem(EXAM_KEY(id));
    if (!v) return null;
    const parsed = sanitizeMockExam(JSON.parse(v));
    return parsed.ok ? parsed.exam : null;
  }, null);
}

export function cacheAttempt(a: MockExamAttemptDoc) {
  safe(() => {
    localStorage.setItem(ATTEMPT_KEY(a.id), JSON.stringify(a));
    if (a.status === "in_progress") {
      localStorage.setItem(ACTIVE_KEY(a.examId), a.id);
    } else {
      localStorage.removeItem(ACTIVE_KEY(a.examId));
    }
  }, undefined);
}
export function readCachedAttempt(id: string): MockExamAttemptDoc | null {
  return safe(() => {
    const v = localStorage.getItem(ATTEMPT_KEY(id));
    return v ? (JSON.parse(v) as MockExamAttemptDoc) : null;
  }, null);
}
export function readActiveAttemptId(examId: string): string | null {
  return safe(() => localStorage.getItem(ACTIVE_KEY(examId)), null);
}

export function cacheResult(r: MockExamResultDoc) {
  safe(() => localStorage.setItem(RESULT_KEY(r.id), JSON.stringify(r)), undefined);
}
export function readCachedResult(id: string): MockExamResultDoc | null {
  return safe(() => {
    const v = localStorage.getItem(RESULT_KEY(id));
    return v ? (JSON.parse(v) as MockExamResultDoc) : null;
  }, null);
}

/** Most recent finished results across all exams (newest first). */
export function listLocalResults(): MockExamResultDoc[] {
  return safe(() => {
    const out: MockExamResultDoc[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith("exam:result:")) continue;
      const v = localStorage.getItem(k);
      if (!v) continue;
      try {
        out.push(JSON.parse(v) as MockExamResultDoc);
      } catch {
        /* ignore */
      }
    }
    return out.sort((a, b) => b.endedAt - a.endedAt);
  }, [] as MockExamResultDoc[]);
}