import type {
  ConfidenceLevel,
  MistakeTag,
  Question,
  QuestionAttempt,
} from "@/types/question";
import { AnswerOptions } from "@/components/exam/AnswerOptions";
import { ExplanationPanel } from "@/components/exam/ExplanationPanel";

interface QuestionCardProps {
  question: Question;
  selectedOption: string | null;
  isChecked: boolean;
  isCorrect: boolean | null;
  showExplanation: boolean;
  confidenceSelection: ConfidenceLevel | null;
  mistakeTag: MistakeTag | null;
  onSelectOption: (option: string) => void;
  onCheckAnswer: () => void;
  onConfidenceSelect: (level: ConfidenceLevel) => void;
  onMistakeTagSelect: (tag: MistakeTag | null) => void;
  recentAttempts?: QuestionAttempt[];
  daysSinceLastAttempt?: number;
  misconceptionHint?: string | null;
}

function getQuestionTag(
  question: Question,
  recentAttempts: QuestionAttempt[],
  daysSince?: number,
): string | null {
  const conceptAttempts = recentAttempts
    .filter((a) => a.concept === question.concept)
    .slice(-2);
  if (
    conceptAttempts.length >= 2 &&
    conceptAttempts.every((a) => !a.isCorrect)
  ) {
    return "You got the last 2 questions in this topic wrong";
  }

  if (daysSince !== undefined && daysSince >= 4) {
    return `You haven't practiced this chapter in ${daysSince} days`;
  }

  if (question.examWeightage && question.examWeightage >= 4) {
    return `This chapter carries ${question.examWeightage} marks in your board exam`;
  }

  return null;
}

const DIFFICULTY_COLOR = {
  easy: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800",
  medium:
    "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800",
  hard: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800",
};

export function QuestionCard({
  question,
  selectedOption,
  isChecked,
  isCorrect,
  showExplanation,
  confidenceSelection,
  mistakeTag,
  onSelectOption,
  onCheckAnswer,
  onConfidenceSelect,
  onMistakeTagSelect,
  recentAttempts = [],
  daysSinceLastAttempt,
  misconceptionHint,
}: QuestionCardProps) {
  const whyTag = getQuestionTag(
    question,
    recentAttempts,
    daysSinceLastAttempt,
  );
  const difficultyClass =
    DIFFICULTY_COLOR[question.difficulty as keyof typeof DIFFICULTY_COLOR] ??
    DIFFICULTY_COLOR.medium;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {question.chapter}
          </span>
          <span className="text-gray-200 dark:text-gray-700">·</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full border font-medium ${difficultyClass}`}
          >
            {question.difficulty}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {question.marks} mark{question.marks > 1 ? "s" : ""}
          </span>
        </div>
        {question.estimatedTime && (
          <span className="text-xs text-gray-300 dark:text-gray-600 flex-shrink-0">
            ~{Math.round(question.estimatedTime / 60)}m
          </span>
        )}
      </div>

      {(whyTag || misconceptionHint) && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-3 italic">
          {misconceptionHint ?? whyTag}
        </p>
      )}

      <p className="text-base text-gray-900 dark:text-gray-100 leading-relaxed font-medium mb-1">
        {question.question}
      </p>

      {question.options?.length ? (
        <AnswerOptions
          options={question.options}
          selectedOption={selectedOption}
          correctAnswer={question.correctAnswer}
          isChecked={isChecked}
          onSelect={onSelectOption}
        />
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          This question has no selectable options.
        </p>
      )}

      {selectedOption && !isChecked && (
        <div className="mt-4">
          <button
            type="button"
            onClick={onCheckAnswer}
            className="w-full py-3 rounded-xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium text-sm hover:bg-gray-700 dark:hover:bg-gray-300 transition-all active:scale-98"
          >
            Check Answer
          </button>
        </div>
      )}

      {showExplanation && isCorrect !== null && (
        <ExplanationPanel
          explanation={question.explanation ?? ""}
          isCorrect={isCorrect}
          confidenceSelection={confidenceSelection}
          mistakeTag={mistakeTag}
          onConfidenceSelect={onConfidenceSelect}
          onMistakeTagSelect={onMistakeTagSelect}
          commonMistakes={question.commonMistakes}
        />
      )}
    </div>
  );
}
