/**
 * QuestionCard — renders a single question with its answer options.
 *
 * BUG FIX 2: Correct/wrong highlight only appears AFTER isChecked === true.
 * BUG FIX 4: Parent must pass key={`${chapter}-${question.id}`} to force
 *            full remount when question changes — prevents stale state leaks.
 *
 * This component has NO internal state. All state lives in useExamEngine.
 */

import { cn } from "@/lib/utils";
import type { Question } from "@/hooks/use-exam-engine";

type Props = {
  question: Question;
  selectedOption: string | null;
  isChecked: boolean;
  isCorrect: boolean | null;
  onSelectOption: (option: string) => void;
};

export function QuestionCard({
  question,
  selectedOption,
  isChecked,
  isCorrect,
  onSelectOption,
}: Props) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      {/* Metadata badges */}
      <div className="mb-4 flex flex-wrap gap-2">
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold capitalize",
            question.difficulty === "easy" &&
              "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
            question.difficulty === "medium" &&
              "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
            question.difficulty === "hard" &&
              "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
          )}
        >
          {question.difficulty}
        </span>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {question.marks} mark{question.marks !== 1 ? "s" : ""}
        </span>
        {question.concept && (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {question.concept}
          </span>
        )}
        {question.cognitiveLevel && (
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground capitalize">
            {question.cognitiveLevel}
          </span>
        )}
      </div>

      {/* Question text */}
      <p className="mb-6 text-base font-medium leading-relaxed text-foreground">
        {question.question}
      </p>

      {/* Answer options */}
      <div className="flex flex-col gap-3">
        {question.options.map((option, idx) => {
          const isSelected = selectedOption === option;
          const isThisCorrectAnswer = option === question.correctAnswer;

          // Colour logic — only active after isChecked === true
          const showCorrect = isChecked && isThisCorrectAnswer;
          const showWrong = isChecked && isSelected && !isCorrect;
          const isUnselectedAfterCheck =
            isChecked && !isSelected && !isThisCorrectAnswer;

          return (
            <button
              key={idx}
              onClick={() => !isChecked && onSelectOption(option)}
              disabled={isChecked}
              aria-pressed={isSelected}
              className={cn(
                "w-full rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-all duration-150",
                // ── Default / not yet checked ─────────────────────────────
                !isSelected &&
                  !isChecked &&
                  "border-border bg-background text-foreground hover:border-primary/60 hover:bg-primary/5",
                // ── Selected, not yet checked ─────────────────────────────
                isSelected &&
                  !isChecked &&
                  "border-primary bg-primary/10 text-primary",
                // ── Correct answer revealed ───────────────────────────────
                showCorrect &&
                  "border-green-500 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200",
                // ── Wrong selection revealed ──────────────────────────────
                showWrong &&
                  "border-red-500 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200",
                // ── Other options after check (greyed out) ────────────────
                isUnselectedAfterCheck && "cursor-default opacity-40",
              )}
            >
              {/* Option letter */}
              <span className="mr-3 inline-block w-5 font-bold">
                {String.fromCharCode(65 + idx)}.
              </span>
              {option}

              {/* Inline indicators after check */}
              {showCorrect && (
                <span className="ml-2 text-green-600 dark:text-green-400">✓</span>
              )}
              {showWrong && (
                <span className="ml-2 text-red-600 dark:text-red-400">✗</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
