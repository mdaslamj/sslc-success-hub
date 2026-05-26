import type { MistakeTag } from "@/types/question";

interface MistakeTaggerProps {
  selected: MistakeTag | null;
  onSelect: (tag: MistakeTag | null) => void;
}

const TAGS: { value: MistakeTag; label: string }[] = [
  { value: "concept", label: "Concept confusion" },
  { value: "calculation", label: "Calculation mistake" },
  { value: "formula", label: "Forgot the formula" },
  { value: "misread", label: "Misread the question" },
  { value: "guess", label: "Just guessed" },
  { value: "careless", label: "Careless mistake" },
];

export function MistakeTagger({ selected, onSelect }: MistakeTaggerProps) {
  return (
    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
          Why did you get this wrong?
          <span className="ml-1 text-xs text-gray-400">(optional)</span>
        </p>
        {selected && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline"
          >
            clear
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {TAGS.map((tag) => {
          const isSelected = selected === tag.value;
          return (
            <button
              key={tag.value}
              type="button"
              onClick={() => onSelect(isSelected ? null : tag.value)}
              className={`px-3 py-1.5 rounded-full border text-xs transition-all duration-150 ${
                isSelected
                  ? "border-red-400 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 dark:border-red-600"
                  : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500"
              }`}
              aria-pressed={isSelected}
            >
              {tag.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
