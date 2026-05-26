import { useEffect, useMemo } from "react";
import type { Question, QuestionAttempt } from "@/types/question";
import { useExamEngine } from "@/hooks/useExamEngine";
import { QuestionCard } from "@/components/exam/QuestionCard";
import { QuestionNavigator } from "@/components/exam/QuestionNavigator";

interface PracticeEngineProps {
  questions: Question[];
  chapterId: string;
  onSessionComplete?: (attempts: QuestionAttempt[], score: number) => void;
}

export function PracticeEngine({
  questions,
  chapterId,
  onSessionComplete,
}: PracticeEngineProps) {
  const {
    state,
    actions,
    questionStatuses,
    canGoNext,
    canGoPrev,
    isLastQuestion,
    isComplete,
  } = useExamEngine(questions, "practice");

  const recentAttempts = useMemo<QuestionAttempt[]>(() => {
    try {
      const raw = localStorage.getItem("aura_attempts");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, [state.currentIndex]);

  const daysSince = useMemo(() => {
    if (!state.currentQuestion) return undefined;
    const chapterAttempts = recentAttempts.filter(
      (a) => a.chapterId === state.currentQuestion!.chapterId,
    );
    if (chapterAttempts.length === 0) return undefined;
    const last = Math.max(...chapterAttempts.map((a) => a.timestamp));
    return Math.floor((Date.now() - last) / (1000 * 60 * 60 * 24));
  }, [recentAttempts, state.currentQuestion]);

  useEffect(() => {
    if (isComplete && onSessionComplete) {
      onSessionComplete(state.sessionAttempts, state.score);
    }
  }, [isComplete, onSessionComplete, state.score, state.sessionAttempts]);

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <p className="text-4xl mb-3">📭</p>
        <p className="text-sm">No questions available for this chapter yet.</p>
      </div>
    );
  }

  if (isComplete) {
    const correctCount = questionStatuses.filter((s) => s === "correct").length;
    const wrongCount = questionStatuses.filter((s) => s === "wrong").length;
    const accuracy = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="flex flex-col items-center gap-6 py-10 px-4 text-center">
        <div className="text-5xl">
          {accuracy >= 80 ? "🎉" : accuracy >= 50 ? "👍" : "💪"}
        </div>
        <div>
          <p className="text-2xl font-medium text-gray-900 dark:text-gray-100">
            {accuracy}%
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {correctCount} correct · {wrongCount} wrong · {questions.length}{" "}
            total
          </p>
        </div>

        {wrongCount > 0 && (
          <button
            type="button"
            onClick={actions.retryWrongQuestions}
            className="px-6 py-2.5 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-sm font-medium hover:bg-amber-100 transition-all"
          >
            Retry {wrongCount} wrong questions
          </button>
        )}

        <button
          type="button"
          onClick={actions.reset}
          className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline"
        >
          Start over
        </button>
      </div>
    );
  }

  if (!state.currentQuestion) return null;

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto px-4 pb-10">
      <QuestionCard
        key={`${chapterId}-${state.currentQuestion.id}`}
        question={state.currentQuestion}
        selectedOption={state.selectedOption}
        isChecked={state.isChecked}
        isCorrect={state.isCorrect}
        showExplanation={state.showExplanation}
        confidenceSelection={state.confidenceSelection}
        mistakeTag={state.mistakeTag}
        onSelectOption={actions.selectOption}
        onCheckAnswer={actions.checkAnswer}
        onConfidenceSelect={actions.setConfidence}
        onMistakeTagSelect={actions.setMistakeTag}
        recentAttempts={recentAttempts}
        daysSinceLastAttempt={daysSince}
      />

      <QuestionNavigator
        currentIndex={state.currentIndex}
        total={state.totalQuestions}
        statuses={questionStatuses}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        isLastQuestion={isLastQuestion}
        isChecked={state.isChecked}
        confidenceSelected={state.confidenceSelection !== null}
        isRetryMode={state.isRetryMode}
        onPrevious={actions.previousQuestion}
        onNext={actions.nextQuestion}
        onGoTo={actions.goToQuestion}
        onRetry={actions.retryWrongQuestions}
        onComplete={() =>
          onSessionComplete?.(state.sessionAttempts, state.score)
        }
      />
    </div>
  );
}
