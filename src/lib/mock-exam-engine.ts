/**
 * Mock exam engine — pure functions to build exams from the local MCQ pool,
 * grade attempts (with optional negative marking), and roll up analytics
 * (per-subject performance, weak topics, time analysis, predicted board %).
 *
 * Designed to be deterministic and Firestore-agnostic so it can run in the
 * browser today and be reused by a future AI / adaptive paper generator.
 */

import type {
  MockExamAnswer,
  MockExamAttemptDoc,
  MockExamDoc,
  MockExamResultDoc,
  McqDoc,
} from "@/integrations/firebase/types";

// ---------------------------------------------------------------------------
// Question selection
// ---------------------------------------------------------------------------

function shuffle<T>(arr: T[], seed = Date.now()): T[] {
  // Deterministic LCG for reproducible mock papers.
  let s = seed >>> 0;
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    s = (1664525 * s + 1013904223) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function buildExamQuestions(
  pool: McqDoc[],
  count: number,
  seed?: number,
): MockExamDoc["questions"] {
  return shuffle(pool, seed)
    .slice(0, count)
    .map((m) => ({
      mcqId: m.id,
      subjectId: m.subjectId,
      chapterId: m.chapterId,
      topic: m.topic,
      question: m.question,
      options: m.options,
      correctIndex: m.correctIndex,
      explanation: m.explanation,
      marks: 1,
      difficulty: m.difficulty,
    }));
}

// ---------------------------------------------------------------------------
// Empty-state attempt + grading
// ---------------------------------------------------------------------------

export function blankAnswers(exam: MockExamDoc): MockExamAnswer[] {
  return (exam.questions ?? []).map((q) => ({
    mcqId: q.mcqId,
    selectedIndex: null,
    marked: false,
    correct: null,
    marksEarned: 0,
  }));
}

/** Grade a single answer with optional negative marking. */
export function gradeAnswer(
  q: MockExamDoc["questions"][number],
  selectedIndex: number | null,
  negativeMarkingFactor: number,
): { correct: boolean; marksEarned: number } {
  if (selectedIndex == null) return { correct: false, marksEarned: 0 };
  if (selectedIndex === q.correctIndex) return { correct: true, marksEarned: q.marks };
  return { correct: false, marksEarned: -q.marks * negativeMarkingFactor };
}

export function gradeAttempt(
  exam: MockExamDoc,
  answers: MockExamAnswer[],
): MockExamAnswer[] {
  return exam.questions.map((q, i) => {
    const a = answers[i];
    const { correct, marksEarned } = gradeAnswer(
      q,
      a?.selectedIndex ?? null,
      exam.negativeMarkingFactor,
    );
    return { ...a, correct, marksEarned };
  });
}

// ---------------------------------------------------------------------------
// Result rollup
// ---------------------------------------------------------------------------

/** Heuristic mapping accuracy + completion → predicted board %. */
function predictBoardScore(accuracy: number, completion: number): number {
  // Weighted blend: students who finish + score well predict higher.
  const base = accuracy * 0.8 + completion * 0.2;
  return Math.max(0, Math.min(100, Math.round(base)));
}

export function buildExamResult(args: {
  attempt: MockExamAttemptDoc;
  exam: MockExamDoc;
  graded: MockExamAnswer[];
  endedAt: number;
  userId: string;
}): MockExamResultDoc {
  const { attempt, exam, graded, endedAt, userId } = args;
  const total = exam.questions.length;
  const correct = graded.filter((a) => a.correct).length;
  const answered = graded.filter((a) => a.selectedIndex != null).length;
  const marksScored = Math.max(
    0,
    Math.round(graded.reduce((s, a) => s + (a.marksEarned ?? 0), 0)),
  );

  const bySubject: MockExamResultDoc["bySubject"] = {};
  const byTopic: MockExamResultDoc["byTopic"] = {};

  for (let i = 0; i < exam.questions.length; i++) {
    const q = exam.questions[i];
    const a = graded[i];
    const sub = (bySubject[q.subjectId] ??= {
      correct: 0,
      total: 0,
      marksScored: 0,
      totalMarks: 0,
      accuracy: 0,
    });
    sub.total += 1;
    sub.totalMarks += q.marks;
    if (a?.correct) {
      sub.correct += 1;
      sub.marksScored += q.marks;
    } else if (a?.marksEarned && a.marksEarned < 0) {
      sub.marksScored += a.marksEarned;
    }

    if (q.topic) {
      const t = (byTopic[q.topic] ??= { correct: 0, total: 0 });
      t.total += 1;
      if (a?.correct) t.correct += 1;
    }
  }
  for (const sub of Object.values(bySubject)) {
    sub.marksScored = Math.max(0, Math.round(sub.marksScored));
    sub.accuracy = sub.total ? Math.round((sub.correct / sub.total) * 100) : 0;
  }

  const weakAreas = Object.entries(byTopic)
    .filter(([, v]) => v.total >= 2 && v.correct / v.total < 0.5)
    .map(([k]) => k);

  const accuracy = total ? Math.round((correct / total) * 100) : 0;
  const completion = total ? Math.round((answered / total) * 100) : 0;
  const durationSeconds = Math.max(0, Math.round((endedAt - attempt.startedAt) / 1000));

  return {
    id: attempt.id, // 1:1 with attempt for cheap lookups
    userId,
    attemptId: attempt.id,
    examId: exam.id,
    kind: exam.kind,
    endedAt,
    dayKey: new Date(endedAt).toISOString().slice(0, 10),
    marksScored,
    totalMarks: exam.totalMarks,
    percentage: exam.totalMarks
      ? Math.round((marksScored / exam.totalMarks) * 100)
      : 0,
    accuracy,
    completion,
    durationSeconds,
    bySubject,
    byTopic,
    weakAreas,
    avgTimePerQuestion: total ? Math.round(durationSeconds / total) : 0,
    predictedBoardScore: predictBoardScore(accuracy, completion),
    // XP: 5 base + 1/correct, capped at 200 — tuned to feel meaningful but
    // not eclipse chapter mastery.
    xpAwarded: Math.min(200, 5 + correct * 1),
  };
}