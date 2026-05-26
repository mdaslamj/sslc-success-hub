interface AnswerOptionsProps {
  options: string[];
  selectedOption: string | null;
  correctAnswer: string;
  isChecked: boolean;
  onSelect: (option: string) => void;
}

export function AnswerOptions({
  options,
  selectedOption,
  correctAnswer,
  isChecked,
  onSelect,
}: AnswerOptionsProps) {
  return (
    <div className="flex flex-col gap-2 mt-4">
      {options.map((option, idx) => {
        const letter = String.fromCharCode(65 + idx);
        const isSelected = selectedOption === option;
        const isRight = isChecked && option === correctAnswer;
        const isWrong = isChecked && isSelected && option !== correctAnswer;

        let classes =
          "flex items-start gap-3 w-full text-left px-4 py-3 rounded-xl border text-sm transition-all duration-150 ";

        if (!isChecked) {
          if (isSelected) {
            classes +=
              "border-gray-800 bg-gray-50 dark:border-gray-200 dark:bg-gray-800 font-medium";
          } else {
            classes +=
              "border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50";
          }
        } else if (isRight) {
          classes +=
            "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200";
        } else if (isWrong) {
          classes +=
            "border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300";
        } else {
          classes += "border-gray-200 dark:border-gray-700 opacity-50";
        }

        return (
          <button
            key={option}
            type="button"
            className={classes}
            onClick={() => !isChecked && onSelect(option)}
            disabled={isChecked}
            aria-pressed={isSelected}
            aria-label={`Option ${letter}: ${option}`}
          >
            <span
              className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-xs font-medium mt-0.5 ${
                isRight
                  ? "border-green-500 bg-green-500 text-white"
                  : isWrong
                    ? "border-red-400 bg-red-400 text-white"
                    : isSelected
                      ? "border-gray-800 bg-gray-800 text-white dark:border-gray-200 dark:bg-gray-200 dark:text-gray-900"
                      : "border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400"
              }`}
            >
              {letter}
            </span>
            <span className="flex-1 leading-relaxed">{option}</span>
            {isRight && (
              <span className="flex-shrink-0 text-green-600 dark:text-green-400 text-lg mt-0.5">
                ✓
              </span>
            )}
            {isWrong && (
              <span className="flex-shrink-0 text-red-500 text-lg mt-0.5">
                ✗
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
