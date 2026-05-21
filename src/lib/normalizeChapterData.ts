import type { MCQ } from "@/lib/mock-data";

export type ContentFormula = {
  label: string;
  expression: string;
  description?: string;
};

export type ContentMCQ = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
};

export type ContentResource = {
  type: string;
  provider: string;
  label: string;
  description?: string;
  url: string;
};

export type ContentExercise = {
  id: string;
  question: string;
  answer?: string;
  type?: string;
};

export type Difficulty = "easy" | "medium" | "hard";

export type NormalizedChapter = {
  id: string;
  chapterNumber: number;
  title: string;
  summary: string;
  difficulty: Difficulty;
  learningPoints: string[];
  formulas: ContentFormula[];
  resources: ContentResource[];
  mcqs: ContentMCQ[];
  exercises: ContentExercise[];
  mcqCount: number;
  exerciseCount: number;
};

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asNumber(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function asDifficulty(v: unknown): Difficulty {
  const s = typeof v === "string" ? v.toLowerCase() : "";
  if (s === "easy" || s === "medium" || s === "hard") return s;
  return "medium";
}

/**
 * Normalize a raw chapter object (from `public/content/chapters/...` or a
 * manifest entry) into a uniform shape with safe defaults.
 */
export function normalizeChapterData(raw: unknown): NormalizedChapter {
  const r = (raw ?? {}) as Record<string, unknown>;
  const mcqs = asArray<ContentMCQ>(r.mcqs);
  const exercises = asArray<ContentExercise>(r.exercises);
  return {
    id: asString(r.id),
    chapterNumber: asNumber(r.chapterNumber),
    title: asString(r.title),
    summary: asString(r.summary),
    difficulty: asDifficulty(r.difficulty),
    learningPoints: asArray<string>(r.learningPoints),
    formulas: asArray<ContentFormula>(r.formulas),
    resources: asArray<ContentResource>(r.resources),
    mcqs,
    exercises,
    mcqCount: mcqs.length || asNumber(r.mcqCount),
    exerciseCount: exercises.length || asNumber(r.exerciseCount),
  };
}

/**
 * Convert content MCQs into the runtime `MCQ` shape used by PracticeQuiz.
 */
export function mapContentMcqs(
  mcqs: ContentMCQ[],
  topic = "General",
): MCQ[] {
  return mcqs.map((m) => {
    const letter = (m.correctAnswer ?? "A").trim().charAt(0).toUpperCase();
    const correctIndex = Math.max(0, letter.charCodeAt(0) - 65);
    const options = (m.options ?? []).map((opt) =>
      opt.replace(/^[A-D][.\)]\s*/i, "").trim(),
    );
    return {
      id: m.id,
      question: m.question,
      options,
      correctIndex: Math.min(correctIndex, Math.max(0, options.length - 1)),
      explanation: m.explanation ?? "",
      topic,
      difficulty: "Medium",
    };
  });
}