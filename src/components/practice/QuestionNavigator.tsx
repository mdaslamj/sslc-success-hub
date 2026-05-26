/**
 * QuestionNavigator — BUG FIX 3.
 *
 * Provides:
 *   - "Question X of Y" counter
 *   - Progress bar
 *   - Dot indicators (unattempted / current / attempted)
 *   - Previous button (disabled on first question)
 *   - Check Answer button (shown before isChecked)
 *   - Next / Submit button (shown after isChecked, disabled if not yet checked)
 */

import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  currentIndex: number;
  totalQuestions: number;
  isChecked: boolean;
  selectedOption: string | null;
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
  onCheckAnswer: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit?: () => void;
};

export function QuestionNavigator({
  currentIndex,
  totalQuestions,
  isChecked,
  selectedOption,
  isFirstQuestion,
  isLastQuestion,
  onCheckAnswer,
  onPrevious,
  onNext,
  onSubmit,
}: Props) {
  const canCheck = !!selectedOption && !isChecked;

  return (
    <div className="flex flex-col gap-4">
      {/* Counter + progress bar */}
      <div className="flex items-center gap-3">
        <span className="shrink-0 text-sm font-semibold text-muted-foreground">
          Question {currentIndex + 1} of {totalQuestions}
        </span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{
              width: `${((currentIndex + 1) / totalQuestions) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Dot indicators */}
      {totalQuestions <= 30 && (
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: totalQuestions }).map((_, i) => (
            <div
              key={i}
              title={`Question ${i + 1}`}
              className={cn(
                "rounded-full transition-all duration-200",
                i < currentIndex
                  ? "h-2 w-2 bg-primary"           // attempted
                  : i === currentIndex
                    ? "h-3 w-3 scale-110 bg-primary ring-2 ring-primary/30" // current
                    : "h-2 w-2 bg-muted",           // not yet reached
              )}
            />
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        {/* Previous */}
        <button
          onClick={onPrevious}
          disabled={isFirstQuestion}
          className="flex items-center gap-1 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        <div className="flex-1" />

        {/* Check Answer — shown until isChecked */}
        {!isChecked && (
          <button
            onClick={onCheckAnswer}
            disabled={!canCheck}
            className={cn(
              "rounded-lg px-6 py-2 text-sm font-semibold transition-all",
              canCheck
                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                : "bg-muted text-muted-foreground cursor-not-allowed",
            )}
          >
            Check Answer
          </button>
        )}

        {/* Next / Submit — shown after isChecked */}
        {isChecked && (
          <>
            {isLastQuestion ? (
              <button
                onClick={onSubmit}
                className="rounded-lg bg-green-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
              >
                Submit Quiz ✓
              </button>
            ) : (
              <button
                onClick={onNext}
                className="flex items-center gap-1 rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
