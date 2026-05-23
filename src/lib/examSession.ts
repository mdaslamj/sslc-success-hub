/**
 * Aura Exam Session Manager
 * -------------------------------------------------------------
 * Lightweight, offline-friendly exam lifecycle manager.
 *
 * Pure client-side (localStorage only).  No backend, no UI, no
 * heavy dependencies.  Reusable for:
 *   - Mock exams
 *   - Chapter tests
 *   - Practice sessions
 *   - Weak-area drills
 *
 * Works with any question source as long as it conforms to the
 * lightweight `ExamQuestion` shape.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExamKind =
  | "full-mock"
  | "chapter-test"
  | "weak-area"
  | "mixed-practice"
  | "custom";

export type ExamStatus = "idle" | "running" | "submitted" | "abandoned";

/** Minimal question shape — any source can map into this. */
export interface ExamQuestion {
  id: string;
  question: string;
  options?: string[];
  /** MCQ: index of the correct option (preferred). */
  correctIndex?: number;
  /** Free-form correct answer text (fallback for non-MCQ). */
  correctAnswer?: string;
  marks: number;
  chapter?: number | string;
  chapter_name?: string;
  concepts?: string[];
  type?: string;
}

export interface ExamConfig {
  id: string;
  kind: ExamKind;
  title: string;
  subject: string;
  chapterId?: string;
  durationSeconds: number;
  questions: ExamQuestion[];
  totalMarks: number;
  /** 0 = no negative marking. e.g. 0.25 = –¼ of marks per wrong answer. */
  negativeMarkingFactor?: number;
  createdAt: number;
}

export interface ExamAnswer {
  questionId: string;
  /** MCQ selection (null = not answered). */
  selectedIndex: number | null;
  /** Free-form text answer (for non-MCQ). */
  textAnswer?: string | null;
  /** Flagged for review. */
  marked: boolean;
  /** Time spent on this question in ms (optional). */
  timeMs?: number;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  kind: ExamKind;
  status: ExamStatus;
  startedAt: number;
  /** Soft deadline = startedAt + durationSeconds*1000. */
  deadlineAt: number;
  endedAt?: number;
  durationSeconds: number;
  /** Parallel array to examConfig.questions. */
  answers: ExamAnswer[];
  /** Last viewed question index (for resume). */
  cursor: number;
  updatedAt: number;
}

export interface ExamResult {
  id: string;
  attemptId: string;
  examId: string;
  kind: ExamKind;
  subject: string;
  endedAt: number;
  marksScored: number;
  totalMarks: number;
  /** marksScored / totalMarks, 0..100. */
  percentage: number;
  /** correct / answered, 0..100. */
  accuracy: number;
  /** answered / total, 0..100. */
  completion: number;
  durationSeconds: number;
  /** Per-chapter rollup. */
  byChapter: Record<
    string,
    {
      correct: number;
      total: number;
      marksScored: number;
      totalMarks: number;
    }
  >;
  /** Per-topic rollup. */
  byTopic: Record<string, { correct: number; total: number }>;
  /** Topics where accuracy < 50 %. */
  weakTopics: string[];
  /** Snapshot of wrong questions for review. */
  wrongQuestions: {
    questionId: string;
    question: string;
    yourAnswer: string;
    correctAnswer: string;
    marks: number;
    concepts?: string[];
  }[];
}

export interface WeakTopic {
  topic: string;
  accuracy: number; // 0..100
  totalQuestions: number;
  correctCount: number;
}

// ---------------------------------------------------------------------------
// localStorage keys
// ---------------------------------------------------------------------------

const LS_EXAM = (id: string) => `aura:exam:${id}`;
const LS_ATTEMPT = (id: string) => `aura:attempt:${id}`;
const LS_ACTIVE = `aura:exam:active`;
const LS_HISTORY = `aura:exam:history`;
const MAX_HISTORY = 100;

// ---------------------------------------------------------------------------
// Safe localStorage helpers
// ---------------------------------------------------------------------------

function safe<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: unknown): void {
  safe(() => localStorage.setItem(key, JSON.stringify(value)), undefined);
}

function lsGet<T>(key: string, fallback: T): T {
  return safe(() => {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  }, fallback);
}

function lsRemove(key: string): void {
  safe(() => localStorage.removeItem(key), undefined);
}

// ---------------------------------------------------------------------------
// Active exam tracking (singleton convenience)
// ---------------------------------------------------------------------------

export function getActiveExamId(): string | null {
  return lsGet<string | null>(LS_ACTIVE, null);
}

export function setActiveExamId(examId: string | null): void {
  if (examId) lsSet(LS_ACTIVE, examId);
  else lsRemove(LS_ACTIVE);
}

// ---------------------------------------------------------------------------
// Exam config persistence
// ---------------------------------------------------------------------------

export function saveExamConfig(config: ExamConfig): void {
  lsSet(LS_EXAM(config.id), config);
}

export function readExamConfig(examId: string): ExamConfig | null {
  return lsGet<ExamConfig | null>(LS_EXAM(examId), null);
}

// ---------------------------------------------------------------------------
// Attempt persistence
// ---------------------------------------------------------------------------

export function saveAttempt(attempt: ExamAttempt): void {
  lsSet(LS_ATTEMPT(attempt.id), attempt);
}

export function readAttempt(attemptId: string): ExamAttempt | null {
  return lsGet<ExamAttempt | null>(LS_ATTEMPT(attemptId), null);
}

export function readActiveAttempt(): ExamAttempt | null {
  const examId = getActiveExamId();
  if (!examId) return null;
  // Find the most recent attempt for this exam.
  const all = listAllAttempts();
  return (
    all
      .filter((a) => a.examId === examId)
      .sort((a, b) => b.startedAt - a.startedAt)[0] ?? null
  );
}

/** Scan localStorage for all persisted attempts. */
export function listAllAttempts(): ExamAttempt[] {
  const out: ExamAttempt[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith("aura:attempt:")) continue;
    const a = lsGet<ExamAttempt | null>(key, null);
    if (a) out.push(a);
  }
  return out.sort((a, b) => b.startedAt - a.startedAt);
}

// ---------------------------------------------------------------------------
// 1. startExam
// ---------------------------------------------------------------------------

export function startExam(config: ExamConfig): ExamAttempt {
  const startedAt = Date.now();
  const attempt: ExamAttempt = {
    id: `att_${startedAt}_${Math.random().toString(36).slice(2, 7)}`,
    examId: config.id,
    kind: config.kind,
    status: "running",
    startedAt,
    deadlineAt: startedAt + config.durationSeconds * 1000,
    durationSeconds: 0,
    answers: config.questions.map((q) => ({
      questionId: q.id,
      selectedIndex: null,
      marked: false,
    })),
    cursor: 0,
    updatedAt: startedAt,
  };

  saveExamConfig(config);
  saveAttempt(attempt);
  setActiveExamId(config.id);

  return attempt;
}

// ---------------------------------------------------------------------------
// 2. saveAnswer
// ---------------------------------------------------------------------------

export function saveAnswer(
  attemptId: string,
  questionId: string,
  patch: Partial<ExamAnswer>,
): ExamAttempt | null {
  const attempt = readAttempt(attemptId);
  if (!attempt || attempt.status !== "running") return null;

  const idx = attempt.answers.findIndex((a) => a.questionId === questionId);
  if (idx === -1) return null;

  const nextAnswers = attempt.answers.slice();
  nextAnswers[idx] = { ...nextAnswers[idx], ...patch };

  const updated: ExamAttempt = {
    ...attempt,
    answers: nextAnswers,
    updatedAt: Date.now(),
  };

  saveAttempt(updated);
  return updated;
}

/** Convenience: save by question index instead of id. */
export function saveAnswerByIndex(
  attemptId: string,
  questionIndex: number,
  patch: Partial<ExamAnswer>,
): ExamAttempt | null {
  const attempt = readAttempt(attemptId);
  if (!attempt || attempt.status !== "running") return null;
  if (questionIndex < 0 || questionIndex >= attempt.answers.length) return null;

  const nextAnswers = attempt.answers.slice();
  nextAnswers[questionIndex] = { ...nextAnswers[questionIndex], ...patch };

  const updated: ExamAttempt = {
    ...attempt,
    answers: nextAnswers,
    updatedAt: Date.now(),
  };

  saveAttempt(updated);
  return updated;
}

/** Update cursor (last viewed question). */
export function setCursor(attemptId: string, index: number): ExamAttempt | null {
  const attempt = readAttempt(attemptId);
  if (!attempt || attempt.status !== "running") return null;
  if (index < 0 || index >= attempt.answers.length) return null;

  const updated: ExamAttempt = { ...attempt, cursor: index, updatedAt: Date.now() };
  saveAttempt(updated);
  return updated;
}

// ---------------------------------------------------------------------------
// 3. submitExam
// ---------------------------------------------------------------------------

export function submitExam(
  attemptId: string,
  reason: "manual" | "timeout" | "abandon" = "manual",
): ExamResult | null {
  const attempt = readAttempt(attemptId);
  if (!attempt) return null;

  const config = readExamConfig(attempt.examId);
  if (!config) return null;

  const endedAt = Date.now();
  const status: ExamStatus =
    reason === "abandon" ? "abandoned" : "submitted";

  const finished: ExamAttempt = {
    ...attempt,
    status,
    endedAt,
    durationSeconds: Math.round((endedAt - attempt.startedAt) / 1000),
    updatedAt: endedAt,
  };

  saveAttempt(finished);

  const result = calculateScore(finished, config);
  recordResult(result);

  if (reason === "timeout") {
    // eslint-disable-next-line no-console
    console.info("[examSession] auto-submitted on timeout", attemptId);
  }

  return result;
}

// ---------------------------------------------------------------------------
// 4. calculateScore
// ---------------------------------------------------------------------------

export function calculateScore(
  attempt: ExamAttempt,
  config: ExamConfig,
): ExamResult {
  const { questions, negativeMarkingFactor = 0 } = config;
  const total = questions.length;
  let answeredCount = 0;
  let correctCount = 0;
  let marksScored = 0;
  let totalMarks = 0;

  const byChapter: ExamResult["byChapter"] = {};
  const byTopic: ExamResult["byTopic"] = {};
  const wrongQuestions: ExamResult["wrongQuestions"] = [];

  for (let i = 0; i < total; i++) {
    const q = questions[i];
    const a = attempt.answers[i];
    const marks = Number(q.marks) || 0;
    totalMarks += marks;

    const chapterKey = String(q.chapter ?? q.chapter_name ?? "unknown");
    byChapter[chapterKey] ??= {
      correct: 0,
      total: 0,
      marksScored: 0,
      totalMarks: 0,
    };
    byChapter[chapterKey].total += 1;
    byChapter[chapterKey].totalMarks += marks;

    const isAnswered = a.selectedIndex != null || (a.textAnswer ?? "").length > 0;
    if (!isAnswered) continue;

    answeredCount += 1;

    const correct = isAnswerCorrect(q, a);
    if (correct) {
      correctCount += 1;
      marksScored += marks;
      byChapter[chapterKey].correct += 1;
      byChapter[chapterKey].marksScored += marks;
    } else {
      const penalty = negativeMarkingFactor * marks;
      marksScored -= penalty;
      byChapter[chapterKey].marksScored -= penalty;

      const userAns = formatUserAnswer(q, a);
      wrongQuestions.push({
        questionId: q.id,
        question: q.question,
        yourAnswer: userAns,
        correctAnswer: formatCorrectAnswer(q),
        marks,
        concepts: q.concepts,
      });
    }
  }

  // Roll up topics
  for (let i = 0; i < total; i++) {
    const q = questions[i];
    const a = attempt.answers[i];
    const concepts = q.concepts?.length ? q.concepts : [q.chapter_name ?? "general"];
    const correct = isAnswerCorrect(q, a);
    for (const t of concepts) {
      byTopic[t] ??= { correct: 0, total: 0 };
      byTopic[t].total += 1;
      if (correct) byTopic[t].correct += 1;
    }
  }

  const weakTopics = deriveWeakTopics(byTopic);
  const percentage = totalMarks ? Math.round((marksScored / totalMarks) * 100) : 0;
  const accuracy = answeredCount ? Math.round((correctCount / answeredCount) * 100) : 0;
  const completion = total ? Math.round((answeredCount / total) * 100) : 0;

  return {
    id: `res_${attempt.id}`,
    attemptId: attempt.id,
    examId: attempt.examId,
    kind: attempt.kind,
    subject: config.subject,
    endedAt: attempt.endedAt ?? Date.now(),
    marksScored: Math.max(0, Math.round(marksScored * 10) / 10),
    totalMarks,
    percentage,
    accuracy,
    completion,
    durationSeconds: attempt.durationSeconds,
    byChapter,
    byTopic,
    weakTopics,
    wrongQuestions,
  };
}

// ---------------------------------------------------------------------------
// 5. getWeakTopicsFromAttempt
// ---------------------------------------------------------------------------

export function getWeakTopicsFromAttempt(result: ExamResult): WeakTopic[] {
  return result.weakTopics.map((topic) => {
    const stat = result.byTopic[topic] ?? { correct: 0, total: 0 };
    return {
      topic,
      accuracy: stat.total ? Math.round((stat.correct / stat.total) * 100) : 0,
      totalQuestions: stat.total,
      correctCount: stat.correct,
    };
  });
}

// ---------------------------------------------------------------------------
// 6. resumeSavedExam
// ---------------------------------------------------------------------------

export function resumeSavedExam(
  examId?: string,
): { attempt: ExamAttempt | null; examConfig: ExamConfig | null } {
  const targetId = examId ?? getActiveExamId();
  if (!targetId) return { attempt: null, examConfig: null };

  const config = readExamConfig(targetId);
  if (!config) return { attempt: null, examConfig: null };

  const attempts = listAllAttempts().filter((a) => a.examId === targetId);
  const active = attempts.find((a) => a.status === "running") ?? null;

  if (active) {
    setActiveExamId(targetId);
    return { attempt: active, examConfig: config };
  }

  // No running attempt — return the config so the caller can start a new one.
  return { attempt: null, examConfig: config };
}

// ---------------------------------------------------------------------------
// Result history
// ---------------------------------------------------------------------------

export function recordResult(result: ExamResult): void {
  safe(() => {
    const all = listCompletedResults();
    const next = [result, ...all].slice(0, MAX_HISTORY);
    lsSet(LS_HISTORY, next);
  }, undefined);
}

export function listCompletedResults(): ExamResult[] {
  return lsGet<ExamResult[]>(LS_HISTORY, []);
}

export function clearExamHistory(): void {
  lsRemove(LS_HISTORY);
}

// ---------------------------------------------------------------------------
// Utility: map from Question Bank / GeneratedExam
// ---------------------------------------------------------------------------

/** Convert `BankQuestion[]` (or any compatible shape) into `ExamQuestion[]`. */
export function normalizeQuestions<Q extends { id: string; question: string }>(
  questions: Q[],
  mapper: (q: Q) => ExamQuestion,
): ExamQuestion[] {
  return questions.map(mapper);
}

/** Pre-built mapper for the Aura question-bank `BankQuestion` shape. */
export function bankQuestionToExamQuestion(q: {
  id: string;
  question: string;
  options?: string[];
  answer?: string;
  marks?: number;
  chapter?: number;
  chapter_name?: string;
  concepts?: string[];
  type?: string;
}): ExamQuestion {
  let correctIndex: number | undefined;
  if (q.options?.length && q.answer) {
    const ans = q.answer.trim().toLowerCase();
    correctIndex = q.options.findIndex(
      (o) => o.trim().toLowerCase() === ans,
    );
    if (correctIndex < 0) correctIndex = undefined;
  }
  return {
    id: q.id,
    question: q.question,
    options: q.options,
    correctIndex,
    correctAnswer: q.answer,
    marks: Number(q.marks) || 0,
    chapter: q.chapter,
    chapter_name: q.chapter_name,
    concepts: q.concepts,
    type: q.type,
  };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function isAnswerCorrect(q: ExamQuestion, a: ExamAnswer): boolean {
  if (a.selectedIndex == null && !a.textAnswer) return false;

  // MCQ path
  if (q.options?.length && a.selectedIndex != null) {
    if (typeof q.correctIndex === "number") {
      return a.selectedIndex === q.correctIndex;
    }
    if (q.correctAnswer) {
      const chosen = q.options[a.selectedIndex]?.trim().toLowerCase();
      return chosen === q.correctAnswer.trim().toLowerCase();
    }
    return false;
  }

  // Text-answer path (lightweight string compare)
  if (a.textAnswer && q.correctAnswer) {
    return a.textAnswer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
  }

  return false;
}

function formatUserAnswer(q: ExamQuestion, a: ExamAnswer): string {
  if (q.options?.length && a.selectedIndex != null) {
    return q.options[a.selectedIndex] ?? `Option ${a.selectedIndex + 1}`;
  }
  return a.textAnswer ?? "—";
}

function formatCorrectAnswer(q: ExamQuestion): string {
  if (typeof q.correctIndex === "number" && q.options?.[q.correctIndex]) {
    return q.options[q.correctIndex];
  }
  return q.correctAnswer ?? "—";
}

function deriveWeakTopics(byTopic: ExamResult["byTopic"]): string[] {
  const out: string[] = [];
  for (const [topic, stat] of Object.entries(byTopic)) {
    if (stat.total < 2) continue; // Need at least 2 questions to judge
    const acc = stat.correct / stat.total;
    if (acc < 0.5) out.push(topic);
  }
  // Sort by worst accuracy first
  out.sort((a, b) => {
    const aa = byTopic[a]!.correct / byTopic[a]!.total;
    const bb = byTopic[b]!.correct / byTopic[b]!.total;
    return aa - bb;
  });
  return out;
}
