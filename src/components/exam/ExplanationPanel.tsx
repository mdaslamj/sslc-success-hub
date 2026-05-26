import type { ConfidenceLevel, MistakeTag } from "@/types/question";
import { ConfidenceSelector } from "@/components/exam/ConfidenceSelector";
import { MistakeTagger } from "@/components/exam/MistakeTagger";

interface ExplanationPanelProps {
  explanation: string;
  isCorrect: boolean;
  confidenceSelection: ConfidenceLevel | null;
  mistakeTag: MistakeTag | null;
  onConfidenceSelect: (level: ConfidenceLevel) => void;
  onMistakeTagSelect: (tag: MistakeTag | null) => void;
  commonMistakes?: string[];
}

export function ExplanationPanel({
  explanation,
  isCorrect,
  confidenceSelection,
  mistakeTag,
  onConfidenceSelect,
  onMistakeTagSelect,
  commonMistakes,
}: ExplanationPanelProps) {
  return (
    <div className="mt-4 rounded-xl border overflow-hidden animate-fade-in">
      <div
        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium ${
          isCorrect
            ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-b border-green-100 dark:border-green-800"
            : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-b border-red-100 dark:border-red-800"
        }`}
      >
        <span className="text-lg">{isCorrect ? "✓" : "✗"}</span>
        {isCorrect ? "Correct!" : "Not quite — here's why:"}
      </div>

      <div className="px-4 py-3 bg-white dark:bg-gray-900">
        {explanation ? (
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {explanation}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            No explanation available for this question.
          </p>
        )}

        {!isCorrect && commonMistakes && commonMistakes.length > 0 && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              <span className="font-medium">Common confusion:</span>{" "}
              {commonMistakes[0]}
            </p>
          </div>
        )}

        <ConfidenceSelector
          selected={confidenceSelection}
          onSelect={onConfidenceSelect}
        />

        {!isCorrect && (
          <MistakeTagger selected={mistakeTag} onSelect={onMistakeTagSelect} />
        )}
      </div>
    </div>
  );
}
