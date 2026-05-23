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
  const rawMcqs = asArray<Record<string, unknown>>(r.mcqs);
  const mcqs: ContentMCQ[] = rawMcqs
    .map((m, i) => {
      const id =
        asString(m.id) ||
        asString(m.q_id) ||
        `${asString(r.id) || asString(r.chapter_id) || "chapter"}-mcq-${i + 1}`;
      const rawOpts = m.options;
      let options: string[] = [];
      if (Array.isArray(rawOpts)) {
        options = rawOpts.map((o) =>
          typeof o === "string" ? o.replace(/^\s*[A-D][.\)]\s*/i, "").trim() : "",
        );
      } else if (rawOpts && typeof rawOpts === "object") {
        options = ["A", "B", "C", "D", "E"]
          .map((k) => (rawOpts as Record<string, unknown>)[k])
          .filter((v): v is string => typeof v === "string");
      }
      const correctAnswer =
        asString(m.correctAnswer) || asString(m.correct) || "A";
      return {
        id,
        question: asString(m.question),
        options,
        correctAnswer,
        explanation: asString(m.explanation),
      };
    })
    .filter((m) => m.question && m.options.length >= 2);

  // Merge in social-science short/long answer banks as exercises.
  const baseExercises = asArray<Record<string, unknown>>(r.exercises).map(
    (e, i): ContentExercise => ({
      id: asString(e.id) || `ex-${i + 1}`,
      question: asString(e.question),
      answer: asString(e.answer),
      type: asString(e.type),
    }),
  );
  const ssBanks = [
    "one_mark_questions",
    "two_mark_questions",
    "three_mark_questions",
    "four_mark_questions",
  ];
  const bankExercises: ContentExercise[] = ssBanks.flatMap((key) =>
    asArray<Record<string, unknown>>(r[key]).map((q, i) => ({
      id: asString(q.id) || `${key}-${i + 1}`,
      question: asString(q.question),
      answer: Array.isArray(q.answer) ? (q.answer as string[]).join("\n") : asString(q.answer),
      type: key.replace("_questions", ""),
    })),
  );
  const exercises = [...baseExercises, ...bankExercises].filter((e) => e.question);
  return {
    id: asString(r.id) || asString(r.chapter_id),
    chapterNumber: asNumber(r.chapterNumber) || asNumber(r.chapter_number),
    title: asString(r.title) || asString(r.chapter_name),
    summary: asString(r.summary),
    difficulty: asDifficulty(r.difficulty),
    learningPoints:
      asArray<string>(r.learningPoints).length > 0
        ? asArray<string>(r.learningPoints)
        : asArray<string>(r.learning_outcomes),
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