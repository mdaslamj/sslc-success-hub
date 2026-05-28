import type {
  MockExamDoc,
  MockExamQuestionRef,
} from "@/integrations/firebase/types";

export type ValidatedMockExam =
  | { ok: true; exam: MockExamDoc }
  | { ok: false; reason: string };

function sanitizeQuestion(
  q: unknown,
  index: number,
): MockExamQuestionRef | null {
  if (!q || typeof q !== "object") return null;
  const raw = q as Record<string, unknown>;
  const options = Array.isArray(raw.options)
    ? raw.options.filter((o): o is string => typeof o === "string" && o.length > 0)
    : [];
  if (options.length < 2) return null;

  const question = typeof raw.question === "string" ? raw.question.trim() : "";
  if (!question) return null;

  const correctIndex =
    typeof raw.correctIndex === "number" && raw.correctIndex >= 0
      ? Math.min(raw.correctIndex, options.length - 1)
      : 0;

  return {
    mcqId:
      typeof raw.mcqId === "string" && raw.mcqId
        ? raw.mcqId
        : `question-${index + 1}`,
    subjectId: typeof raw.subjectId === "string" ? raw.subjectId : "",
    chapterId:
      typeof raw.chapterId === "string" ? raw.chapterId : undefined,
    topic: typeof raw.topic === "string" ? raw.topic : undefined,
    question,
    options,
    correctIndex,
    explanation:
      typeof raw.explanation === "string" ? raw.explanation : undefined,
    marks:
      typeof raw.marks === "number" && Number.isFinite(raw.marks) && raw.marks > 0
        ? raw.marks
        : 1,
    difficulty:
      raw.difficulty === "Easy" ||
      raw.difficulty === "Medium" ||
      raw.difficulty === "Hard"
        ? raw.difficulty
        : undefined,
  };
}

/** Normalize and validate a mock exam before the player renders. */
export function sanitizeMockExam(raw: unknown): ValidatedMockExam {
  if (!raw || typeof raw !== "object") {
    return { ok: false, reason: "Exam data is missing or invalid." };
  }

  const doc = raw as MockExamDoc;
  if (typeof doc.id !== "string" || !doc.id.trim()) {
    return { ok: false, reason: "Exam id is missing." };
  }

  const rawQuestions = Array.isArray(doc.questions) ? doc.questions : [];
  const questions = rawQuestions
    .map(sanitizeQuestion)
    .filter((q): q is MockExamQuestionRef => q !== null);

  if (questions.length === 0) {
    return {
      ok: false,
      reason: "This exam has no valid questions yet. Try again after content loads.",
    };
  }

  const durationSeconds =
    typeof doc.durationSeconds === "number" && doc.durationSeconds > 0
      ? doc.durationSeconds
      : 60 * 60;
  const negativeMarkingFactor =
    typeof doc.negativeMarkingFactor === "number" &&
    Number.isFinite(doc.negativeMarkingFactor)
      ? doc.negativeMarkingFactor
      : 0;
  const totalMarks =
    typeof doc.totalMarks === "number" && doc.totalMarks > 0
      ? doc.totalMarks
      : questions.reduce((s, q) => s + q.marks, 0);

  return {
    ok: true,
    exam: {
      ...doc,
      id: doc.id.trim(),
      kind: doc.kind ?? "full",
      title: doc.title?.trim() || "Mock Exam",
      subjects: Array.isArray(doc.subjects)
        ? doc.subjects.filter((s): s is string => typeof s === "string")
        : doc.subjectId
          ? [doc.subjectId]
          : [],
      durationSeconds,
      negativeMarkingFactor,
      totalMarks,
      questions,
      createdAt:
        typeof doc.createdAt === "number" && Number.isFinite(doc.createdAt)
          ? doc.createdAt
          : Date.now(),
    },
  };
}
