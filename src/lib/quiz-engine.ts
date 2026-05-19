/**
 * Pure quiz engine — no React, no Firestore, no DOM. Easy to unit-test and
 * to call from a future server function (e.g. AI-scored long-form answers,
 * adaptive next-question selection, mock exam compositing).
 *
 * Every dynamic behaviour (scoring, XP, weak-topic detection) lives here so
 * UI / hooks stay thin and future modes (`mock`, `adaptive`, `ai`) can be
 * added by extending these functions only.
 */

import type {
  McqDoc,
  QuizAnswer,
  QuizAttemptDoc,
  QuizDoc,
  QuizMode,
  QuizQuestionRef,
} from "@/integrations/firebase/types";
import { XP_REWARDS } from "./xp";

/** Inline an MCQ as a quiz question slot. */
export function mcqToQuestion(m: McqDoc): QuizQuestionRef {
  return {
    mcqId: m.id,
    question: m.question,
    options: m.options,
    correctIndex: m.correctIndex,
    explanation: m.explanation,
    topic: m.topic,
    difficulty: m.difficulty,
  };
}

/**
 * Build a quiz on the fly from a pool of MCQs. Used by the local-first
 * store today; identical signature is reusable for server-side AI quiz
 * generation tomorrow.
 */
export function buildQuizFromMcqs(
  mcqs: McqDoc[],
  opts: {
    subjectId: string;
    chapterId?: string;
    title: string;
    mode?: QuizMode;
    durationSeconds?: number;
    limit?: number;
    shuffle?: boolean;
    source?: "system" | "user" | "ai";
  },
): QuizDoc {
  const pool = opts.shuffle ? shuffle(mcqs) : mcqs;
  const questions = pool.slice(0, opts.limit ?? pool.length).map(mcqToQuestion);
  return {
    id: `q_${opts.subjectId}_${opts.chapterId ?? "all"}_${Date.now().toString(36)}`,
    subjectId: opts.subjectId,
    chapterId: opts.chapterId,
    title: opts.title,
    mode: opts.mode ?? "practice",
    durationSeconds: opts.durationSeconds ?? 0,
    questions,
    difficulty: "Mixed",
    source: opts.source ?? "system",
    createdAt: Date.now(),
  };
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Grade a single answer against the inlined question. */
export function gradeAnswer(
  q: QuizQuestionRef,
  selectedIndex: number | null,
  timeMs?: number,
): QuizAnswer {
  return {
    mcqId: q.mcqId,
    selectedIndex,
    correct: selectedIndex !== null && selectedIndex === q.correctIndex,
    topic: q.topic,
    timeMs,
  };
}

export type QuizResult = {
  score: number;
  total: number;
  accuracy: number;     // 0..100
  completion: number;   // 0..100
  weakTopics: string[];
  xpAwarded: number;
  perfect: boolean;
};

/** Aggregate per-answer grades into the result row stored on an attempt. */
export function summarizeAnswers(
  questions: QuizQuestionRef[],
  answers: QuizAnswer[],
): QuizResult {
  const total = questions.length;
  const answered = answers.filter((a) => a.selectedIndex !== null).length;
  const score = answers.filter((a) => a.correct).length;
  const accuracy = total ? Math.round((score / total) * 100) : 0;
  const completion = total ? Math.round((answered / total) * 100) : 0;
  const wrongTopics = new Set<string>();
  for (const a of answers) {
    if (!a.correct && a.topic) wrongTopics.add(a.topic);
  }
  const perfect = total > 0 && score === total;
  const xpAwarded = computeXp(score, total, accuracy, perfect);
  return {
    score,
    total,
    accuracy,
    completion,
    weakTopics: Array.from(wrongTopics),
    xpAwarded,
    perfect,
  };
}

/**
 * XP for an attempt: per-correct + flat quiz-completion bonus + accuracy
 * tier bonus. Centralised here so future modes (mock/adaptive) can override
 * by passing a custom rewards object without changing call sites.
 */
export function computeXp(
  score: number,
  total: number,
  accuracy: number,
  perfect: boolean,
): number {
  if (total <= 0) return 0;
  let xp = score * XP_REWARDS.mcqCorrect + XP_REWARDS.quizCompleted;
  if (perfect) xp += XP_REWARDS.quizPerfectBonus;
  else if (accuracy >= 90) xp += XP_REWARDS.quizHighAccuracyBonus;
  return xp;
}

/** Aggregate stats across many attempts — used by analytics + dashboards. */
export type QuizAggregate = {
  attempts: number;
  totalQuestions: number;
  totalCorrect: number;
  averageScore: number;     // mean of per-attempt accuracy (0..100)
  averageCompletion: number;
  bestAccuracy: number;
  perfectScores: number;
  /** Topic -> wrong-answer count, descending. */
  weakTopics: { topic: string; misses: number }[];
  /** Subject -> attempts. */
  bySubject: Record<string, number>;
};

export function aggregateAttempts(attempts: QuizAttemptDoc[]): QuizAggregate {
  if (attempts.length === 0) {
    return {
      attempts: 0,
      totalQuestions: 0,
      totalCorrect: 0,
      averageScore: 0,
      averageCompletion: 0,
      bestAccuracy: 0,
      perfectScores: 0,
      weakTopics: [],
      bySubject: {},
    };
  }
  const topicMisses: Record<string, number> = {};
  const bySubject: Record<string, number> = {};
  let totalQuestions = 0;
  let totalCorrect = 0;
  let bestAccuracy = 0;
  let perfectScores = 0;
  let accSum = 0;
  let compSum = 0;
  for (const a of attempts) {
    totalQuestions += a.total;
    totalCorrect += a.score;
    accSum += a.accuracy;
    compSum += a.completion;
    if (a.accuracy > bestAccuracy) bestAccuracy = a.accuracy;
    if (a.total > 0 && a.score === a.total) perfectScores += 1;
    bySubject[a.subjectId] = (bySubject[a.subjectId] ?? 0) + 1;
    for (const ans of a.answers) {
      if (!ans.correct && ans.topic) {
        topicMisses[ans.topic] = (topicMisses[ans.topic] ?? 0) + 1;
      }
    }
  }
  const weakTopics = Object.entries(topicMisses)
    .map(([topic, misses]) => ({ topic, misses }))
    .sort((a, b) => b.misses - a.misses)
    .slice(0, 10);
  return {
    attempts: attempts.length,
    totalQuestions,
    totalCorrect,
    averageScore: Math.round(accSum / attempts.length),
    averageCompletion: Math.round(compSum / attempts.length),
    bestAccuracy,
    perfectScores,
    weakTopics,
    bySubject,
  };
}