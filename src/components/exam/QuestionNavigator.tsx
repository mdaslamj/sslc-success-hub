import type { AttemptStatus } from "@/hooks/useExamEngine";

interface QuestionNavigatorProps {
  currentIndex: number;
  total: number;
  statuses: AttemptStatus[];
  canGoPrev: boolean;
  canGoNext: boolean;
  isLastQuestion: boolean;
  isChecked: boolean;
  confidenceSelected: boolean;
  isRetryMode: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onGoTo: (index: number) => void;
  onRetry: () => void;
  onComplete?: () => void;
}

export function QuestionNavigator({
  currentIndex,
  total,
  statuses,
  canGoPrev,
  canGoNext,
  isLastQuestion,
  isChecked,
  confidenceSelected,
  isRetryMode,
  onPrevious,
  onNext,
  onGoTo,
  onRetry,
  onComplete,
}: QuestionNavigatorProps) {
  const wrongCount = statuses.filter((s) => s === "wrong").length;
  const doneCount = statuses.filter((s) => s !== "unattempted").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {statuses.map((status, idx) => {
          const isCurrent = idx === currentIndex;
          let pillClass =
            "w-8 h-8 rounded-lg text-xs font-medium border transition-all duration-150 cursor-pointer flex items-center justify-center ";

          if (isCurrent) {
            pillClass +=
              "border-gray-800 bg-gray-800 text-white dark:border-gray-200 dark:bg-gray-200 dark:text-gray-900 scale-110";
          } else if (status === "correct") {
            pillClass +=
              "border-green-400 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 hover:scale-105";
          } else if (status === "wrong") {
            pillClass +=
              "border-red-300 bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 hover:scale-105";
          } else {
            pillClass +=
              "border-gray-200 dark:border-gray-700 text-gray-400 hover:border-gray-400 hover:scale-105";
          }

          return (
            <button
              key={idx}
              type="button"
              className={pillClass}
              onClick={() => onGoTo(idx)}
              aria-label={`Go to question ${idx + 1}, ${status}`}
              aria-current={isCurrent ? "true" : undefined}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>
          Question {currentIndex + 1} of {total}
          {isRetryMode && " (retry mode)"}
        </span>
        <span>{doneCount} answered</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={!canGoPrev}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          aria-label="Previous question"
        >
          ← Previous
        </button>

        <div className="flex-1" />

        {wrongCount > 0 && !isRetryMode && (
          <button
            type="button"
            onClick={onRetry}
            className="px-4 py-2 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-sm hover:bg-amber-100 transition-all"
          >
            Retry {wrongCount} wrong
          </button>
        )}

        {!isLastQuestion ? (
          <button
            type="button"
            onClick={onNext}
            disabled={!isChecked || !confidenceSelected}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            aria-label="Next question"
          >
            Next →
          </button>
        ) : (
          <button
            type="button"
            onClick={onComplete}
            disabled={!isChecked || !confidenceSelected}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-green-700 text-white text-sm font-medium hover:bg-green-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Finish ✓
          </button>
        )}
      </div>

      {isChecked && !confidenceSelected && (
        <p className="text-xs text-center text-gray-400 dark:text-gray-500">
          Select your confidence level to continue
        </p>
      )}
    </div>
  );
}
