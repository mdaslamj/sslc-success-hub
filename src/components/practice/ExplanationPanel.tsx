
/**
 * ExplanationPanel — shown only when isChecked === true.
 *
 * Renders in this order:
 *   1. Result banner (correct / incorrect)
 *   2. Explanation text
 *   3. Confidence selector (always shown after check)
 *   4. Mistake tagger (only shown if isCorrect === false)
 */

import { cn } from "@/lib/utils";
import type { ConfidenceLevel, MistakeTag } from "@/hooks/use-exam-engine";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CONFIDENCE_OPTIONS: {
  value: ConfidenceLevel;
  label: string;
  emoji: string;
}[] = [
  { value: "high", label: "Very confident", emoji: "💪" },
  { value: "medium", label: "Somewhat sure", emoji: "🤔" },
  { value: "low", label: "Just guessed", emoji: "😅" },
];

const MISTAKE_TAGS: { value: MistakeTag; label: string; emoji: string }[] = [
  { value: "concept", label: "Didn't know concept", emoji: "📚" },
  { value: "careless", label: "Careless mistake", emoji: "😓" },
  { value: "calculation", label: "Calculation error", emoji: "🔢" },
  { value: "guess", label: "Random guess", emoji: "🎲" },
  { value: "timeup", label: "Ran out of time", emoji: "⏱️" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Props = {
  explanation: string;
  isCorrect: boolean;
  confidenceSelection: ConfidenceLevel | null;
  mistakeTag: MistakeTag | null;
  onSetConfidence: (level: ConfidenceLevel) => void;
  onSetMistakeTag: (tag: MistakeTag) => void;
};

export function ExplanationPanel({
  explanation,
  isCorrect,
  confidenceSelection,
  mistakeTag,
  onSetConfidence,
  onSetMistakeTag,
}: Props) {
  return (
    <div className="flex flex-col gap-4 mt-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* 1. Result banner */}
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border p-4",
          isCorrect
            ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
            : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950",
        )}
      >
        <span className="text-2xl">{isCorrect ? "✅" : "❌"}</span>
        <div>
          <p
            className={cn(
              "font-semibold",
              isCorrect
                ? "text-green-800 dark:text-green-200"
                : "text-red-800 dark:text-red-200",
            )}
          >
            {isCorrect ? "Correct! Well done." : "Incorrect. Let's learn from this."}
          </p>
          {isCorrect && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
              Keep it up!
            </p>
          )}
        </div>
      </div>

      {/* 2. Explanation */}
      <div className="rounded-xl border border-border bg-muted/40 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Explanation
        </p>
        <p className="text-sm leading-relaxed text-foreground">{explanation}</p>
      </div>

      {/* 3. Confidence selector — always shown after check */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-3 text-sm font-semibold text-foreground">
          How confident were you?
        </p>
        <div className="flex flex-wrap gap-2">
          {CONFIDENCE_OPTIONS.map(({ value, label, emoji }) => (
            <button
              key={value}
              onClick={() => onSetConfidence(value)}
              className={cn(
                "rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all",
                confidenceSelection === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-primary/5",
              )}
            >
              {emoji} {label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Mistake tagger — only shown if answer was wrong */}
      {!isCorrect && (
        <div className="rounded-xl border border-red-200 bg-red-50/60 p-4 dark:border-red-800 dark:bg-red-950/40">
          <p className="mb-3 text-sm font-semibold text-foreground">
            What went wrong?{" "}
            <span className="font-normal text-muted-foreground text-xs">
              (optional — helps you spot patterns)
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {MISTAKE_TAGS.map(({ value, label, emoji }) => (
              <button
                key={value}
                onClick={() => onSetMistakeTag(value)}
                className={cn(
                  "rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all",
                  mistakeTag === value
                    ? "border-red-500 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"
                    : "border-border bg-background text-muted-foreground hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-950",
                )}
              >
                {emoji} {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
