/**
 * Local seed catalog of mock exams. Used when Firestore `mockExams` is empty
 * so the feature is fully usable in dev / for guest users. Chapter ids align
 * with content slugs (`mock_{subject}_ch_{slug}`).
 *
 * Lovable = visual generation · Cursor = engineering · GitHub = source of truth
 */
import { SEED_MCQS } from "./quiz-seed";
import { buildExamQuestions } from "./mock-exam-engine";
import type { MockExamDoc } from "@/integrations/firebase/types";

function pickBySubject(subjectId: string, n: number, seed: number) {
  const pool = SEED_MCQS.filter((m) => m.subjectId === subjectId);
  return buildExamQuestions(pool, Math.min(n, pool.length), seed);
}
function pickMixed(n: number, seed: number) {
  return buildExamQuestions(SEED_MCQS, Math.min(n, SEED_MCQS.length), seed);
}

const now = Date.now();

const RAW: MockExamDoc[] = [
  {
    id: "mock_math_full_01",
    kind: "full",
    title: "Mathematics — Full Mock Exam",
    description: "KSEAB board-pattern full paper covering all 15 chapters.",
    subjectId: "math",
    subjects: ["math"],
    durationSeconds: 60 * 60,
    totalMarks: 0,
    negativeMarkingFactor: 0,
    questions: pickBySubject("math", 20, 11),
    order: 1,
    source: "system",
    createdAt: now,
  },
  {
    id: "mock_science_full_01",
    kind: "full",
    title: "Science — Full Mock Exam",
    description: "Comprehensive Science paper — all 13 rationalised chapters.",
    subjectId: "science",
    subjects: ["science"],
    durationSeconds: 60 * 60,
    totalMarks: 0,
    negativeMarkingFactor: 0.25,
    questions: pickBySubject("science", 20, 22),
    order: 2,
    source: "system",
    createdAt: now,
  },
  {
    id: "mock_math_ch_quadratic-equations",
    kind: "chapter",
    title: "Quadratic Equations — Chapter Test",
    description: "Focused practice on quadratic equations (Chapter 4).",
    subjectId: "math",
    chapterId: "quadratic-equations",
    subjects: ["math"],
    durationSeconds: 20 * 60,
    totalMarks: 0,
    negativeMarkingFactor: 0,
    questions: buildExamQuestions(
      SEED_MCQS.filter((m) => m.chapterId === "quadratic-equations"),
      10,
      33,
    ),
    order: 3,
    source: "system",
    createdAt: now,
  },
  {
    id: "mock_mixed_01",
    kind: "mixed",
    title: "Mixed Revision — Math, Science, Social",
    description: "Multi-subject mixed paper for SSLC quick revision.",
    subjects: ["math", "science", "social"],
    durationSeconds: 45 * 60,
    totalMarks: 0,
    negativeMarkingFactor: 0,
    questions: pickMixed(25, 44),
    order: 4,
    source: "system",
    createdAt: now,
  },
  {
    id: "mock_prev_2024",
    kind: "previous",
    title: "SSLC 2024 — Previous Year Pattern",
    description: "Simulates the KSEAB 2024 Mathematics board paper structure.",
    subjectId: "math",
    subjects: ["math"],
    year: "2024",
    durationSeconds: 90 * 60,
    totalMarks: 0,
    negativeMarkingFactor: 0,
    questions: pickBySubject("math", 25, 55),
    order: 5,
    source: "system",
    createdAt: now,
  },
];

export const SEED_MOCK_EXAMS: MockExamDoc[] = RAW.map((e) => ({
  ...e,
  totalMarks: e.questions.reduce((s, q) => s + q.marks, 0),
}));
