/**
 * Phase-1 Mock Test Engine — pure helpers.
 *
 * Lightweight, MCQ-only, fully client-side. Sources questions from the
 * already-loaded `IndexedChapter[]` (see `content-question-index`) so we
 * reuse the existing chapter JSON pipeline with zero new schemas, loaders
 * or backend calls.
 *
 * Supports two test kinds today:
 *   - "chapter" — pick from a single chapter's MCQ pool
 *   - "subject" — pick proportionally across all chapters of a subject
 *
 * Designed to stay extension-friendly: add weak-topic / adaptive selection
 * later by swapping `pickRandom` for a smarter picker — UI + store don't
 * need to change.
 */

import type { IndexedChapter, IndexedQuestion } from "@/lib/content-question-index";

export type MockTestKind = "chapter" | "subject";

export type MockTestQuestion = {
  id: string;
  chapterId: string;
  chapterTitle: string;
  topic: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type MockTest = {
  id: string;
  kind: MockTestKind;
  subjectId: string;
  subjectName: string;
  /** Only set for chapter tests. */
  chapterId?: string;
  title: string;
  durationSeconds: number;
  questions: MockTestQuestion[];
  createdAt: number;
};

// ---------------------------------------------------------------------------
// IDs (stable so revisits hit the cached test)
// ---------------------------------------------------------------------------

export function chapterTestId(subjectId: string, chapterId: string): string {
  return `mt_chapter_${subjectId}_${chapterId}`;
}
export function subjectTestId(subjectId: string): string {
  return `mt_subject_${subjectId}`;
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function toMcqs(qs: IndexedQuestion[]): IndexedQuestion[] {
  return qs.filter((q) => q.questionType === "mcq" && q.options.length >= 2);
}

function pickRandom(pool: IndexedQuestion[], count: number): IndexedQuestion[] {
  return shuffle(pool).slice(0, count);
}

function toTestQuestion(q: IndexedQuestion): MockTestQuestion {
  return {
    id: q.id,
    chapterId: q.chapterId,
    chapterTitle: q.chapterTitle,
    topic: q.topic,
    question: q.question,
    options: q.options,
    correctIndex: Math.max(0, q.correctIndex),
    explanation: q.explanation ?? "",
  };
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

export type BuildOptions = { count?: number; durationSeconds?: number };

export function buildChapterTest(args: {
  subjectId: string;
  subjectName: string;
  chapter: IndexedChapter;
  options?: BuildOptions;
}): MockTest | null {
  const { subjectId, subjectName, chapter } = args;
  const desired = args.options?.count ?? 10;
  const pool = toMcqs(chapter.questions);
  if (pool.length === 0) return null;
  const picks = pickRandom(pool, Math.min(desired, pool.length));
  return {
    id: chapterTestId(subjectId, chapter.chapterId),
    kind: "chapter",
    subjectId,
    subjectName,
    chapterId: chapter.chapterId,
    title: `${chapter.title} — Chapter Test`,
    durationSeconds: args.options?.durationSeconds ?? Math.max(5, picks.length) * 60,
    questions: picks.map(toTestQuestion),
    createdAt: Date.now(),
  };
}

export function buildSubjectTest(args: {
  subjectId: string;
  subjectName: string;
  chapters: IndexedChapter[];
  options?: BuildOptions;
}): MockTest | null {
  const { subjectId, subjectName, chapters } = args;
  const desired = args.options?.count ?? 25;
  // Spread roughly evenly across chapters, then top up from the global pool.
  const perChapter = Math.max(1, Math.ceil(desired / Math.max(1, chapters.length)));
  const seen = new Set<string>();
  const picks: IndexedQuestion[] = [];
  for (const c of chapters) {
    const pool = toMcqs(c.questions).filter((q) => !seen.has(q.id));
    for (const q of pickRandom(pool, perChapter)) {
      seen.add(q.id);
      picks.push(q);
      if (picks.length >= desired) break;
    }
    if (picks.length >= desired) break;
  }
  if (picks.length < desired) {
    const rest = shuffle(
      chapters.flatMap((c) => toMcqs(c.questions)).filter((q) => !seen.has(q.id)),
    );
    for (const q of rest) {
      if (picks.length >= desired) break;
      seen.add(q.id);
      picks.push(q);
    }
  }
  if (picks.length === 0) return null;
  return {
    id: subjectTestId(subjectId),
    kind: "subject",
    subjectId,
    subjectName,
    title: `${subjectName} — Subject Test`,
    durationSeconds: args.options?.durationSeconds ?? Math.max(15, picks.length * 60),
    questions: shuffle(picks).map(toTestQuestion),
    createdAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Grading
// ---------------------------------------------------------------------------

export type MockTestResult = {
  total: number;
  answered: number;
  correct: number;
  scorePct: number;
  accuracyPct: number;
};

export function gradeTest(
  test: MockTest,
  answers: (number | null)[],
): MockTestResult {
  const total = test.questions.length;
  let answered = 0;
  let correct = 0;
  test.questions.forEach((q, i) => {
    const a = answers[i];
    if (a == null) return;
    answered += 1;
    if (a === q.correctIndex) correct += 1;
  });
  return {
    total,
    answered,
    correct,
    scorePct: total ? Math.round((correct / total) * 100) : 0,
    accuracyPct: answered ? Math.round((correct / answered) * 100) : 0,
  };
}