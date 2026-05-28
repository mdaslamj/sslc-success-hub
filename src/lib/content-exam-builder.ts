/**
 * Build `QuizDoc` (chapter tests) and `MockExamDoc` (subject mocks) from
 * the content-driven question index. Pure functions — UI components feed
 * in the loaded chapters and get an engine-ready document back, then hand
 * it to `useQuiz` / `useMockExam` unchanged.
 *
 * Keeping the builders separate from the loader keeps the system modular
 * for future adaptive selection (replace `pickByBlueprint` with a model
 * call) without touching the UI or engine.
 */

import { buildQuizFromMcqs } from "./quiz-engine";
import {
  flattenQuestions,
  toExamQuestionRefs,
  toMcqDocs,
  type IndexedChapter,
  type IndexedQuestion,
  loadIndexedChapter,
  toContentSubjectId,
} from "./content-question-index";
import { chapterKeysMatch, normalizeChapterKey } from "./normalizeChapterKey";
import type { MockExamDoc, QuizDoc } from "@/integrations/firebase/types";

// ---------------------------------------------------------------------------
// Chapter Test (QuizDoc)
// ---------------------------------------------------------------------------

export type ChapterTestLevel = "easy" | "board" | "challenge";

const LEVEL_PROFILES: Record<
  ChapterTestLevel,
  { count: number; durationSeconds: number; shuffle: boolean }
> = {
  easy: { count: 8, durationSeconds: 0, shuffle: false },
  board: { count: 15, durationSeconds: 20 * 60, shuffle: true },
  challenge: { count: 20, durationSeconds: 25 * 60, shuffle: true },
};

/** Stable id so repeated clicks on the same level reuse the cached quiz. */
export function chapterTestQuizId(
  subjectId: string,
  chapterId: string,
  level: ChapterTestLevel,
): string {
  return `ct_${subjectId}_${chapterId}_${level}`;
}

const CHAPTER_TEST_LEVELS: ChapterTestLevel[] = ["easy", "board", "challenge"];

/**
 * Reconstruct a chapter-test QuizDoc from its stable id. Mirrors
 * `rebuildContentExamById` — used by the quiz player when a deep link or
 * refresh hits a cold cache. Id shape: `ct_{subjectId}_{chapterId}_{level}`.
 */
export function rebuildContentQuizById(
  quizId: string,
  catalogue: {
    subjects: { runtimeId: string; chapters: IndexedChapter[] }[];
  },
): QuizDoc | null {
  if (!quizId.startsWith("ct_")) return null;
  const level = CHAPTER_TEST_LEVELS.find((l) => quizId.endsWith(`_${l}`));
  if (!level) return null;
  const middle = quizId.slice("ct_".length, quizId.length - (`_${level}`.length));
  for (const s of catalogue.subjects) {
    const prefix = `${s.runtimeId}_`;
    if (!middle.startsWith(prefix)) continue;
    const chapterId = middle.slice(prefix.length);
    const chapter = s.chapters.find((c) => c.chapterId === chapterId);
    if (chapter) {
      return buildChapterTestQuiz({ chapter, level });
    }
  }
  return null;
}

export function buildChapterTestQuiz(args: {
  chapter: IndexedChapter;
  level: ChapterTestLevel;
}): QuizDoc | null {
  const { chapter, level } = args;
  const profile = LEVEL_PROFILES[level];
  const mcqs = toMcqDocs(chapter.questions);
  if (mcqs.length === 0) return null;

  const quiz = buildQuizFromMcqs(mcqs, {
    subjectId: chapter.subjectId,
    chapterId: chapter.chapterId,
    title: `${chapter.title} · ${labelFor(level)}`,
    mode: profile.durationSeconds > 0 ? "timed" : "practice",
    durationSeconds: profile.durationSeconds,
    limit: Math.min(profile.count, mcqs.length),
    shuffle: profile.shuffle,
    source: "system",
  });
  // Override the auto-generated id so this quiz is addressable + cacheable
  // by (subject, chapter, level) across navigations.
  return { ...quiz, id: chapterTestQuizId(chapter.subjectId, chapter.chapterId, level) };
}

function labelFor(level: ChapterTestLevel): string {
  if (level === "easy") return "Easy practice";
  if (level === "board") return "Board level";
  return "Challenge";
}

// ---------------------------------------------------------------------------
// Subject Mock Exam (MockExamDoc) — blueprint-weighted selection
// ---------------------------------------------------------------------------

export type SubjectMockOptions = {
  /** Total MCQ count to assemble. Default 30. */
  count?: number;
  /** Exam duration. Default 60 minutes. */
  durationSeconds?: number;
  /** -1/4 style negative marking factor. Default 0. */
  negativeMarkingFactor?: number;
  /** Deterministic seed for reproducible papers. Defaults to now. */
  seed?: number;
};

/**
 * Pick `count` questions across the supplied chapters proportional to each
 * chapter's `blueprintWeight` (KSEAB marks-per-chapter). Dedup'd by id.
 */
export function pickByBlueprint(
  chapters: IndexedChapter[],
  count: number,
  seed: number,
): IndexedQuestion[] {
  const totalWeight = chapters.reduce((s, c) => s + c.blueprintWeight, 0) || 1;
  const out: IndexedQuestion[] = [];
  const taken = new Set<string>();
  let rng = seed >>> 0;
  const nextRand = () => {
    rng = (1664525 * rng + 1013904223) >>> 0;
    return rng / 0xffffffff;
  };

  for (const c of chapters) {
    const slots = Math.max(1, Math.round((c.blueprintWeight / totalWeight) * count));
    const pool = (c.questions ?? [])
      .filter((q) => q.questionType === "mcq" && q.options.length > 0)
      .filter((q) => !taken.has(q.id));
    // Deterministic shuffle of the chapter pool, then take `slots`.
    const shuffled = pool
      .map((q) => ({ q, k: nextRand() }))
      .sort((a, b) => a.k - b.k)
      .map((x) => x.q);
    for (const q of shuffled.slice(0, slots)) {
      taken.add(q.id);
      out.push(q);
    }
    if (out.length >= count) break;
  }

  // Top up if rounding under-filled the paper.
  if (out.length < count) {
    for (const c of chapters) {
      for (const q of c.questions ?? []) {
        if (out.length >= count) break;
        if (q.questionType !== "mcq" || q.options.length === 0) continue;
        if (taken.has(q.id)) continue;
        taken.add(q.id);
        out.push(q);
      }
    }
  }

  return out.slice(0, count);
}

export function subjectMockExamId(subjectId: string): string {
  return `mock_${subjectId}_blueprint`;
}

export function buildSubjectMockExam(args: {
  subjectId: string;
  subjectName: string;
  chapters: IndexedChapter[];
  options?: SubjectMockOptions;
}): MockExamDoc | null {
  const { subjectId, subjectName, chapters } = args;
  if (chapters.length === 0) return null;
  const count = args.options?.count ?? 30;
  const durationSeconds = args.options?.durationSeconds ?? 60 * 60;
  const negativeMarkingFactor = args.options?.negativeMarkingFactor ?? 0;
  const seed = args.options?.seed ?? Date.now();

  const picks = pickByBlueprint(chapters, count, seed);
  const questions = toExamQuestionRefs(picks);
  if (questions.length === 0) return null;

  const totalMarks = questions.reduce((s, q) => s + q.marks, 0);
  return {
    id: subjectMockExamId(subjectId),
    kind: "full",
    title: `${subjectName} — Full Mock Exam`,
    description: `Board-blueprint paper assembled from ${chapters.length} chapters.`,
    subjectId,
    subjects: [subjectId],
    durationSeconds,
    totalMarks,
    negativeMarkingFactor,
    questions,
    order: 1,
    source: "system",
    createdAt: Date.now(),
  };
}

export function chapterMockExamId(subjectId: string, chapterId: string): string {
  return `mock_${subjectId}_ch_${chapterId}`;
}

/** Single-chapter mock paper (kind: "chapter") — used by the exams catalog. */
export function buildChapterMockExam(args: {
  subjectId: string;
  chapter: IndexedChapter;
  options?: { count?: number; durationSeconds?: number };
}): MockExamDoc | null {
  const { subjectId, chapter } = args;
  const count = args.options?.count ?? 10;
  const durationSeconds = args.options?.durationSeconds ?? 15 * 60;
  const questions = toExamQuestionRefs(chapter.questions).slice(0, count);
  if (questions.length === 0) return null;

  return {
    id: chapterMockExamId(subjectId, chapter.chapterId),
    kind: "chapter",
    title: `${chapter.title} — Chapter Test`,
    description: `Focused practice for ${chapter.title}.`,
    subjectId,
    chapterId: chapter.chapterId,
    subjects: [subjectId],
    durationSeconds,
    totalMarks: questions.reduce((s, q) => s + q.marks, 0),
    negativeMarkingFactor: 0,
    questions,
    order: 10 + chapter.chapterNumber,
    source: "system",
    createdAt: Date.now(),
  };
}

/** Mixed multi-subject revision paper. */
export function buildMixedMockExam(args: {
  bySubject: { subjectId: string; chapters: IndexedChapter[] }[];
  count?: number;
  durationSeconds?: number;
  seed?: number;
}): MockExamDoc | null {
  const count = args.count ?? 25;
  const durationSeconds = args.durationSeconds ?? 45 * 60;
  const seed = args.seed ?? Date.now();
  const perSubject = Math.max(1, Math.floor(count / args.bySubject.length));

  const picks: IndexedQuestion[] = [];
  for (const s of args.bySubject) {
    picks.push(...pickByBlueprint(s.chapters, perSubject, seed));
  }
  // Re-dedup just in case (different subjects share no IDs in practice).
  const seen = new Set<string>();
  const unique = picks.filter((q) => (seen.has(q.id) ? false : (seen.add(q.id), true)));
  const questions = toExamQuestionRefs(unique).slice(0, count);
  if (questions.length === 0) return null;

  const subjects = Array.from(new Set(args.bySubject.map((s) => s.subjectId)));
  return {
    id: "mock_mixed_blueprint",
    kind: "mixed",
    title: "Mixed Revision — All Subjects",
    description: "Cross-subject blueprint paper for quick revision.",
    subjects,
    durationSeconds,
    totalMarks: questions.reduce((s, q) => s + q.marks, 0),
    negativeMarkingFactor: 0,
    questions,
    order: 4,
    source: "system",
    createdAt: Date.now(),
  };
}

function findIndexedChapter(
  chapters: IndexedChapter[],
  slug: string,
): IndexedChapter | undefined {
  const normalized = normalizeChapterKey(slug);
  return chapters.find(
    (c) =>
      c.chapterId === slug ||
      normalizeChapterKey(c.chapterId) === normalized ||
      normalizeChapterKey(c.title) === normalized ||
      chapterKeysMatch(c.chapterId, slug),
  );
}

/**
 * Reconstruct a chapter mock exam by loading chapter JSON directly.
 * Works even when the full subject catalog has not hydrated yet.
 */
export async function rebuildChapterMockExamById(
  examId: string,
): Promise<MockExamDoc | null> {
  const match = examId.match(/^mock_(math|science|social)_ch_(.+)$/);
  if (!match) return null;

  const runtimeId = match[1] as "math" | "science" | "social";
  const chapterSlug = decodeURIComponent(match[2]);
  const contentId = toContentSubjectId(runtimeId);
  if (!contentId) return null;

  const chapter = await loadIndexedChapter(contentId, chapterSlug);
  if (!chapter) {
    if (import.meta.env.DEV) {
      console.warn("[exam] chapter mock rebuild failed — no chapter", {
        examId,
        contentId,
        chapterSlug,
      });
    }
    return null;
  }

  const mcqCount = chapter.questions.filter((q) => q.questionType === "mcq").length;
  if (mcqCount === 0) {
    if (import.meta.env.DEV) {
      console.warn("[exam] chapter mock rebuild failed — no MCQs indexed", {
        examId,
        chapterId: chapter.chapterId,
      });
    }
    return null;
  }

  return buildChapterMockExam({ subjectId: runtimeId, chapter });
}

// ---------------------------------------------------------------------------
// Convenience: rebuild any content-generated exam from its id
// ---------------------------------------------------------------------------

/**
 * Reconstruct a content-generated exam by id. Used by the exam player
 * route when the user opens a deep link and the local cache has been
 * cleared. Returns null if the id doesn't match any known pattern.
 */
export function rebuildContentExamById(
  examId: string,
  catalogue: {
    subjects: { runtimeId: string; name: string; chapters: IndexedChapter[] }[];
  },
): MockExamDoc | null {
  try {
    return rebuildContentExamByIdUnsafe(examId, catalogue);
  } catch (err) {
    console.warn("[exam] rebuild failed", { examId, err });
    return null;
  }
}

function rebuildContentExamByIdUnsafe(
  examId: string,
  catalogue: {
    subjects: { runtimeId: string; name: string; chapters: IndexedChapter[] }[];
  },
): MockExamDoc | null {
  // Full subject mock: mock_{subjectId}_blueprint
  for (const s of catalogue.subjects) {
    if (examId === subjectMockExamId(s.runtimeId)) {
      return buildSubjectMockExam({
        subjectId: s.runtimeId,
        subjectName: s.name,
        chapters: s.chapters,
        // Re-use a stable seed so the regenerated paper matches the cached one.
        options: { seed: hashSeed(examId) },
      });
    }
    // Chapter test: mock_{subjectId}_ch_{chapterId}
    const chapterPrefix = `mock_${s.runtimeId}_ch_`;
    if (examId.startsWith(chapterPrefix)) {
      const chapterId = examId.slice(chapterPrefix.length);
      const chapter = findIndexedChapter(s.chapters, chapterId);
      if (chapter) {
        const built = buildChapterMockExam({ subjectId: s.runtimeId, chapter });
        if (built) return built;
        if (import.meta.env.DEV) {
          console.warn("[exam] chapter mock sync rebuild empty", {
            examId,
            chapterId: chapter.chapterId,
            mcqs: chapter.questions.filter((q) => q.questionType === "mcq").length,
          });
        }
      } else if (import.meta.env.DEV) {
        console.warn("[exam] chapter slug not in catalog", {
          examId,
          chapterId,
          catalogIds: s.chapters.map((c) => c.chapterId),
        });
      }
    }
  }
  if (examId === "mock_mixed_blueprint") {
    return buildMixedMockExam({
      bySubject: catalogue.subjects.map((s) => ({
        subjectId: s.runtimeId,
        chapters: s.chapters,
      })),
      seed: hashSeed(examId),
    });
  }
  return null;
}

function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}