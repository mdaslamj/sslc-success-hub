/**
 * SessionResultsScreen — Task 2
 *
 * Shown after student clicks "Submit Quiz" in PracticeSession.
 * Displays: score, accuracy, time taken, per-question breakdown,
 * wrong question list, and retry / new chapter buttons.
 */

import { cn } from "@/lib/utils";
import { Clock, Target, Trophy, XCircle, CheckCircle, RefreshCw, BookOpen } from "lucide-react";
import type { Question } from "@/hooks/use-exam-engine";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QuestionResult = {
  question: Question;
  selectedOption: string | null;
  isCorrect: boolean;
  timeTakenMs: number;
};

type Props = {
  chapterName: string;
  subjectName: string;
  score: number;
  totalMarks: number;
  results: QuestionResult[];
  onRetryWrong: () => void;
  onNewChapter: () => void;
  onRetryAll: () => void;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function getGrade(accuracy: number): { label: string; emoji: string; color: string } {
  if (accuracy >= 90) return { label: "Excellent!", emoji: "🏆", color: "text-yellow-600" };
  if (accuracy >= 75) return { label: "Great job!", emoji: "🌟", color: "text-blue-600" };
  if (accuracy >= 60) return { label: "Good effort!", emoji: "👍", color: "text-green-600" };
  if (accuracy >= 40) return { label: "Keep practising", emoji: "📚", color: "text-orange-600" };
  return { label: "Needs revision", emoji: "💪", color: "text-red-600" };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SessionResultsScreen({
  chapterName,
  subjectName,
  score,
  totalMarks,
  results,
  onRetryWrong,
  onNewChapter,
  onRetryAll,
}: Props) {
  const totalQuestions = results.length;
  const correctCount = results.filter((r) => r.isCorrect).length;
  const wrongCount = totalQuestions - correctCount;
  const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const totalTimeMs = results.reduce((acc, r) => acc + r.timeTakenMs, 0);
  const avgTimeMs = totalQuestions > 0 ? Math.round(totalTimeMs / totalQuestions) : 0;
  const grade = getGrade(accuracy);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 text-center">
        <span className="text-5xl">{grade.emoji}</span>
        <h1 className={cn("mt-2 text-2xl font-bold", grade.color)}>{grade.label}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {subjectName} · {chapterName}
        </p>
      </div>

      {/* Score card */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {/* Big score */}
        <div className="flex items-center justify-center gap-2 border-b border-border py-6">
          <span className="text-5xl font-bold text-foreground">{score}</span>
          <span className="text-2xl text-muted-foreground">/ {totalMarks}</span>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 divide-x divide-border">
          <div className="flex flex-col items-center gap-1 p-4">
            <Target className="h-5 w-5 text-primary" />
            <span className="text-xl font-bold text-foreground">{accuracy}%</span>
            <span className="text-xs text-muted-foreground">Accuracy</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-4">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-xl font-bold text-green-600">{correctCount}</span>
            <span className="text-xs text-muted-foreground">Correct</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-4">
            <Clock className="h-5 w-5 text-orange-500" />
            <span className="text-xl font-bold text-foreground">{formatTime(avgTimeMs)}</span>
            <span className="text-xs text-muted-foreground">Avg / Q</span>
          </div>
        </div>
      </div>

      {/* Accuracy bar */}
      <div className="mb-6">
        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
          <span>{correctCount} correct</span>
          <span>{wrongCount} wrong</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-red-100 dark:bg-red-950">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-700"
            style={{ width: `${accuracy}%` }}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="mb-6 flex flex-col gap-3">
        {wrongCount > 0 && (
          <button
            onClick={onRetryWrong}
            className="flex items-center justify-center gap-2 rounded-xl bg-red-600 py-3 font-semibold text-white shadow-sm transition hover:bg-red-700"
          >
            <RefreshCw className="h-4 w-4" />
            Retry {wrongCount} Wrong Question{wrongCount !== 1 ? "s" : ""}
          </button>
        )}
        <button
          onClick={onRetryAll}
          className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 font-semibold text-foreground transition hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" />
          Retry All Questions
        </button>
        <button
          onClick={onNewChapter}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
        >
          <BookOpen className="h-4 w-4" />
          Choose New Chapter
        </button>
      </div>

      {/* Question-by-question breakdown */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Question Breakdown
        </h2>
        <div className="flex flex-col gap-2">
          {results.map((result, idx) => (
            <div
              key={result.question.id}
              className={cn(
                "rounded-xl border p-4 transition-all",
                result.isCorrect
                  ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
                  : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30",
              )}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                {result.isCorrect ? (
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                ) : (
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                )}

                <div className="flex-1 min-w-0">
                  {/* Question text */}
                  <p className="text-sm font-medium text-foreground line-clamp-2">
                    Q{idx + 1}. {result.question.question}
                  </p>

                  {/* Answer details */}
                  <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    {!result.isCorrect && result.selectedOption && (
                      <span className="text-red-600 dark:text-red-400">
                        Your answer: {result.selectedOption}
                      </span>
                    )}
                    {!result.isCorrect && (
                      <span className="text-green-600 dark:text-green-400">
                        Correct: {result.question.correctAnswer}
                      </span>
                    )}
                    <span className="text-muted-foreground">
                      ⏱ {formatTime(result.timeTakenMs)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
