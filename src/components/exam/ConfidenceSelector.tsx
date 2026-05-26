import type { ConfidenceLevel } from "@/types/question";

interface ConfidenceSelectorProps {
  selected: ConfidenceLevel | null;
  onSelect: (level: ConfidenceLevel) => void;
}

const OPTIONS: {
  value: ConfidenceLevel;
  label: string;
  emoji: string;
  desc: string;
}[] = [
  { value: "high", label: "Very confident", emoji: "💪", desc: "I knew this" },
  {
    value: "medium",
    label: "Somewhat confident",
    emoji: "🤔",
    desc: "Mostly sure",
  },
  { value: "guess", label: "I guessed", emoji: "🎲", desc: "Not sure at all" },
  { value: "unsure", label: "Not sure", emoji: "😕", desc: "Didn't know" },
];

export function ConfidenceSelector({
  selected,
  onSelect,
}: ConfidenceSelectorProps) {
  return (
    <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 font-medium">
        How confident were you?
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {OPTIONS.map((opt) => {
          const isSelected = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(opt.value)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all duration-150 ${
                isSelected
                  ? "border-gray-800 bg-gray-800 text-white dark:border-gray-200 dark:bg-gray-200 dark:text-gray-900"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              }`}
              aria-pressed={isSelected}
            >
              <span className="text-xl">{opt.emoji}</span>
              <span className="text-xs font-medium leading-tight">
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
