/**
 * Weak-Area Tracker — local-only, lightweight.
 *
 * Records signals from mock-test attempts so later phases (adaptive planner,
 * recommendations, retry-wrong flow) have a reusable structure to read from
 * without a backend.
 *
 * Storage namespace: `aura:weak:*`. All writes are wrapped in try/catch so a
 * full / unavailable localStorage never breaks the runner UI.
 */

import type { MockTest } from "@/lib/mock-test/engine";

const WRONG_KEY = "aura:weak:wrong";
const CHAPTER_KEY = "aura:weak:chapters";
const CONFIDENCE_KEY = "aura:weak:confidence";
const MAX_WRONG = 200;

export type WrongAnswerEntry = {
  questionId: string;
  chapterId: string;
  chapterTitle: string;
  topic: string;
  subjectId: string;
  selectedIndex: number | null;
  correctIndex: number;
  at: number;
};

export type ChapterAccuracyEntry = {
  chapterId: string;
  chapterTitle: string;
  subjectId: string;
  attempts: number;
  totalQs: number;
  correctQs: number;
  accuracyPct: number;
  lastSeenAt: number;
};

export type ConfidenceLevel = "low" | "medium" | "high";

export type ConfidenceEntry = {
  chapterId: string;
  level: ConfidenceLevel;
  updatedAt: number;
};

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

function readJson<T>(key: string, fallback: T): T {
  return safe(() => {
    const v = localStorage.getItem(key);
    if (!v) return fallback;
    return JSON.parse(v) as T;
  }, fallback);
}

function writeJson(key: string, value: unknown): void {
  safe(() => localStorage.setItem(key, JSON.stringify(value)), undefined);
}

// ---- Wrong answers --------------------------------------------------------

export function listWrongAnswers(): WrongAnswerEntry[] {
  const arr = readJson<WrongAnswerEntry[]>(WRONG_KEY, []);
  return Array.isArray(arr) ? arr : [];
}

export function recordWrongAnswers(entries: WrongAnswerEntry[]): void {
  if (entries.length === 0) return;
  // De-dupe by questionId — most recent attempt wins.
  const existing = listWrongAnswers();
  const seen = new Set(entries.map((e) => e.questionId));
  const merged = [...entries, ...existing.filter((e) => !seen.has(e.questionId))].slice(
    0,
    MAX_WRONG,
  );
  writeJson(WRONG_KEY, merged);
}

/** Remove entries whose questions the student now answered correctly. */
export function clearWrongAnswers(questionIds: string[]): void {
  if (questionIds.length === 0) return;
  const drop = new Set(questionIds);
  writeJson(WRONG_KEY, listWrongAnswers().filter((e) => !drop.has(e.questionId)));
}

// ---- Chapter accuracy -----------------------------------------------------

export function listChapterAccuracy(): ChapterAccuracyEntry[] {
  const arr = readJson<ChapterAccuracyEntry[]>(CHAPTER_KEY, []);
  return Array.isArray(arr) ? arr : [];
}

export function updateChapterAccuracy(
  rows: Array<{
    chapterId: string;
    chapterTitle: string;
    subjectId: string;
    total: number;
    correct: number;
  }>,
): void {
  if (rows.length === 0) return;
  const map = new Map(listChapterAccuracy().map((e) => [e.chapterId, e]));
  const now = Date.now();
  for (const r of rows) {
    const prev = map.get(r.chapterId);
    const totalQs = (prev?.totalQs ?? 0) + r.total;
    const correctQs = (prev?.correctQs ?? 0) + r.correct;
    map.set(r.chapterId, {
      chapterId: r.chapterId,
      chapterTitle: r.chapterTitle,
      subjectId: r.subjectId,
      attempts: (prev?.attempts ?? 0) + 1,
      totalQs,
      correctQs,
      accuracyPct: totalQs ? Math.round((correctQs / totalQs) * 100) : 0,
      lastSeenAt: now,
    });
  }
  writeJson(CHAPTER_KEY, Array.from(map.values()));
}

// ---- Confidence -----------------------------------------------------------

export function listConfidence(): ConfidenceEntry[] {
  const arr = readJson<ConfidenceEntry[]>(CONFIDENCE_KEY, []);
  return Array.isArray(arr) ? arr : [];
}

/** Derive a calm confidence level from an accuracy percentage. */
export function confidenceFromAccuracy(pct: number): ConfidenceLevel {
  if (pct >= 80) return "high";
  if (pct >= 50) return "medium";
  return "low";
}

export function setConfidence(chapterId: string, level: ConfidenceLevel): void {
  const map = new Map(listConfidence().map((e) => [e.chapterId, e]));
  map.set(chapterId, { chapterId, level, updatedAt: Date.now() });
  writeJson(CONFIDENCE_KEY, Array.from(map.values()));
}

// ---- High-level recorder used by the mock-test runner --------------------

export function recordAttemptSignals(args: {
  test: MockTest;
  answers: (number | null)[];
}): void {
  const { test, answers } = args;

  // Wrong answers
  const wrong: WrongAnswerEntry[] = [];
  const correctIds: string[] = [];
  test.questions.forEach((q, i) => {
    const a = answers[i];
    if (a != null && a === q.correctIndex) {
      correctIds.push(q.id);
      return;
    }
    wrong.push({
      questionId: q.id,
      chapterId: q.chapterId,
      chapterTitle: q.chapterTitle,
      topic: q.topic,
      subjectId: test.subjectId,
      selectedIndex: a ?? null,
      correctIndex: q.correctIndex,
      at: Date.now(),
    });
  });
  recordWrongAnswers(wrong);
  clearWrongAnswers(correctIds);

  // Chapter accuracy + confidence
  const buckets = new Map<
    string,
    { chapterId: string; chapterTitle: string; total: number; correct: number }
  >();
  test.questions.forEach((q, i) => {
    const b =
      buckets.get(q.chapterId) ??
      { chapterId: q.chapterId, chapterTitle: q.chapterTitle, total: 0, correct: 0 };
    b.total += 1;
    if (answers[i] === q.correctIndex) b.correct += 1;
    buckets.set(q.chapterId, b);
  });
  const rows = Array.from(buckets.values()).map((b) => ({
    ...b,
    subjectId: test.subjectId,
  }));
  updateChapterAccuracy(rows);
  for (const r of rows) {
    const pct = r.total ? Math.round((r.correct / r.total) * 100) : 0;
    setConfidence(r.chapterId, confidenceFromAccuracy(pct));
  }
}

// ---- Read helpers for future weak-area surfaces --------------------------

export function getWeakChapters(limit = 5): ChapterAccuracyEntry[] {
  return [...listChapterAccuracy()]
    .filter((c) => c.accuracyPct < 60)
    .sort((a, b) => a.accuracyPct - b.accuracyPct)
    .slice(0, limit);
}