/**
 * Content-driven question index.
 *
 * Loads chapter JSON from `public/content/chapters/{subjectId}/` (already
 * cached in localStorage by `loadChapter`) and flattens MCQs + exercises
 * into a uniform `IndexedQuestion` shape. Other engines (quiz, mock exam,
 * adaptive learning, AI tutor) consume this single index instead of having
 * to know the raw JSON layout.
 *
 * Design notes:
 *  - Zero Firestore reads. All content lives as static JSON in `public/`.
 *  - `loadChapter` already caches per-chapter JSON in localStorage, so the
 *    second visit hits the disk cache, not the network.
 *  - Question IDs are deduped via a `Set` so accidental duplicates in
 *    uploaded JSON never produce empty/double slots in an exam.
 *  - Subject id mapping (content "mathematics" ↔ runtime "math") is
 *    centralised here so callers don't have to think about it.
 */

import { loadChapter, loadManifest } from "./contentLoader";
import type {
  McqDoc,
  MockExamQuestionRef,
} from "@/integrations/firebase/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IndexedDifficulty = "Easy" | "Medium" | "Hard";
export type IndexedQuestionType = "mcq" | "exercise" | "pyq";

export type IndexedQuestion = {
  /** Stable id straight from the source JSON. */
  id: string;
  /** Runtime subject id ("math" / "science"). */
  subjectId: string;
  /** Chapter slug, e.g. "real-numbers". */
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  /** Free-form topic; defaults to the chapter title. */
  topic: string;
  difficulty: IndexedDifficulty;
  marks: number;
  questionType: IndexedQuestionType;
  question: string;
  /** MCQ-only. Empty for exercise/pyq. */
  options: string[];
  /** MCQ-only. -1 for exercise/pyq. */
  correctIndex: number;
  /** Plain-text answer (exercises & pyqs). */
  answer: string;
  explanation: string;
  /** Per-chapter weight from manifest (KSEAB blueprint marks). 1 if unknown. */
  blueprintWeight: number;
};

export type IndexedChapter = {
  subjectId: string;
  chapterId: string;
  chapterNumber: number;
  title: string;
  difficulty: IndexedDifficulty;
  blueprintWeight: number;
  questions: IndexedQuestion[];
};

// ---------------------------------------------------------------------------
// Subject id mapping (content slug ↔ runtime id)
// ---------------------------------------------------------------------------

const CONTENT_TO_RUNTIME: Record<string, string> = {
  mathematics: "math",
  math: "math",
  science: "science",
};
const RUNTIME_TO_CONTENT: Record<string, string> = {
  math: "mathematics",
  mathematics: "mathematics",
  science: "science",
};

export function toContentSubjectId(runtimeId: string): string | null {
  return RUNTIME_TO_CONTENT[runtimeId] ?? null;
}
export function toRuntimeSubjectId(contentId: string): string {
  return CONTENT_TO_RUNTIME[contentId] ?? contentId;
}

/** Subjects that currently ship content under `public/content/chapters/`. */
export const CONTENT_SUBJECTS = [
  { contentId: "mathematics", runtimeId: "math" },
  { contentId: "science", runtimeId: "science" },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}
function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function asNumber(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function normDifficulty(v: unknown): IndexedDifficulty {
  const s = typeof v === "string" ? v.toLowerCase() : "";
  if (s === "easy") return "Easy";
  if (s === "hard") return "Hard";
  return "Medium";
}

/** Convert the "A"/"B"/"C"/"D" answer letter into a 0-based option index. */
function letterToIndex(letter: unknown): number {
  const s = typeof letter === "string" ? letter.trim().charAt(0).toUpperCase() : "";
  const code = s.charCodeAt(0) - 65;
  return code >= 0 && code < 26 ? code : 0;
}

function stripLetterPrefix(opt: unknown): string {
  const s = typeof opt === "string" ? opt : "";
  return s.replace(/^\s*[A-D][.\)]\s*/i, "").trim();
}

// ---------------------------------------------------------------------------
// Indexing
// ---------------------------------------------------------------------------

function indexChapter(args: {
  runtimeSubjectId: string;
  chapterDoc: Record<string, unknown>;
  manifestEntry?: Record<string, unknown>;
}): IndexedChapter {
  const { runtimeSubjectId, chapterDoc, manifestEntry } = args;
  const chapterId = asString(chapterDoc.id) || asString(manifestEntry?.id);
  const chapterNumber =
    asNumber(chapterDoc.chapterNumber) || asNumber(manifestEntry?.chapterNumber);
  const title = asString(chapterDoc.title) || asString(manifestEntry?.title);
  const difficulty = normDifficulty(
    chapterDoc.difficulty ?? manifestEntry?.difficulty,
  );
  const blueprintWeight =
    asNumber(manifestEntry?.blueprintMarks) ||
    asNumber(chapterDoc.blueprintMarks) ||
    1;

  const seen = new Set<string>();
  const out: IndexedQuestion[] = [];

  // MCQs ------------------------------------------------------------------
  for (const raw of asArray<Record<string, unknown>>(chapterDoc.mcqs)) {
    const id = asString(raw.id);
    if (!id || seen.has(id)) continue;
    const options = asArray<unknown>(raw.options).map(stripLetterPrefix);
    if (options.length < 2) continue;
    seen.add(id);
    out.push({
      id,
      subjectId: runtimeSubjectId,
      chapterId,
      chapterNumber,
      chapterTitle: title,
      topic: title,
      difficulty,
      marks: 1,
      questionType: "mcq",
      question: asString(raw.question),
      options,
      correctIndex: Math.min(
        letterToIndex(raw.correctAnswer),
        options.length - 1,
      ),
      answer: asString(raw.correctAnswer),
      explanation: asString(raw.explanation),
      blueprintWeight,
    });
  }

  // Exercises -------------------------------------------------------------
  for (const raw of asArray<Record<string, unknown>>(chapterDoc.exercises)) {
    const id = asString(raw.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      subjectId: runtimeSubjectId,
      chapterId,
      chapterNumber,
      chapterTitle: title,
      topic: title,
      difficulty,
      marks: asNumber(raw.marks) || (difficulty === "Hard" ? 3 : 2),
      questionType: "exercise",
      question: asString(raw.question),
      options: [],
      correctIndex: -1,
      answer: asString(raw.answer),
      explanation: asString(raw.answer),
      blueprintWeight,
    });
  }

  // PYQs (science only at the moment) -------------------------------------
  for (const raw of asArray<Record<string, unknown>>(chapterDoc.pyqs)) {
    const id = asString(raw.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      subjectId: runtimeSubjectId,
      chapterId,
      chapterNumber,
      chapterTitle: title,
      topic: title,
      difficulty,
      marks: asNumber(raw.marks) || 1,
      questionType: "pyq",
      question: asString(raw.question),
      options: [],
      correctIndex: -1,
      answer: asString(raw.answer),
      explanation: asString(raw.answer),
      blueprintWeight,
    });
  }

  return {
    subjectId: runtimeSubjectId,
    chapterId,
    chapterNumber,
    title,
    difficulty,
    blueprintWeight,
    questions: out,
  };
}

type ManifestChapter = {
  id: string;
  chapterNumber?: number;
  title?: string;
  status?: string;
  difficulty?: string;
  blueprintMarks?: number;
};

/**
 * Load + index every `status:"ready"` chapter for a content subject. Skips
 * (and logs) chapters whose JSON fails to load instead of throwing — one bad
 * chapter must never break the whole exam catalog.
 */
export async function loadIndexedSubject(
  contentSubjectId: string,
): Promise<IndexedChapter[]> {
  const runtimeSubjectId = toRuntimeSubjectId(contentSubjectId);
  const manifest = (await loadManifest(contentSubjectId).catch(() => null)) as
    | { chapters?: ManifestChapter[] }
    | null;
  const entries = (manifest?.chapters ?? []).filter(
    (c) => (c.status ?? "ready") === "ready",
  );
  const loaded = await Promise.all(
    entries.map(async (entry) => {
      try {
        const doc = (await loadChapter(contentSubjectId, entry.id)) as Record<
          string,
          unknown
        >;
        return indexChapter({
          runtimeSubjectId,
          chapterDoc: doc,
          manifestEntry: entry as unknown as Record<string, unknown>,
        });
      } catch (err) {
        console.warn(
          `[content-index] skip chapter ${contentSubjectId}/${entry.id}`,
          err,
        );
        return null;
      }
    }),
  );
  return loaded.filter((c): c is IndexedChapter => c !== null);
}

/** Flatten indexed chapters into a single question pool, MCQs only by default. */
export function flattenQuestions(
  chapters: IndexedChapter[],
  opts: { types?: IndexedQuestionType[] } = {},
): IndexedQuestion[] {
  const types = opts.types ?? ["mcq"];
  const seen = new Set<string>();
  const out: IndexedQuestion[] = [];
  for (const c of chapters) {
    for (const q of c.questions) {
      if (!types.includes(q.questionType)) continue;
      if (seen.has(q.id)) continue;
      seen.add(q.id);
      out.push(q);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Adapters → existing engine shapes
// ---------------------------------------------------------------------------

/** Lift indexed MCQs into the McqDoc shape used by quiz-engine. */
export function toMcqDocs(qs: IndexedQuestion[]): McqDoc[] {
  return qs
    .filter((q) => q.questionType === "mcq" && q.options.length > 0)
    .map((q) => ({
      id: q.id,
      subjectId: q.subjectId,
      chapterId: q.chapterId,
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      difficulty: q.difficulty,
      topic: q.topic,
    }));
}

/** Lift indexed MCQs into the MockExamQuestionRef shape used by exam-engine. */
export function toExamQuestionRefs(
  qs: IndexedQuestion[],
): MockExamQuestionRef[] {
  return qs
    .filter((q) => q.questionType === "mcq" && q.options.length > 0)
    .map((q) => ({
      mcqId: q.id,
      subjectId: q.subjectId,
      chapterId: q.chapterId,
      topic: q.topic,
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      marks: q.marks,
      difficulty: q.difficulty,
    }));
}
