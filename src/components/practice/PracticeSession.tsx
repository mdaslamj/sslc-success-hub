/**
 * PracticeSession — wires useExamEngine with all practice UI components.
 *
 * BUG FIX 4: key={`${selectedChapter}-${currentQuestion?.id}`} on QuestionCard
 *            forces a full remount on every question change, preventing stale
 *            internal state from leaking between questions.
 *
 * Drop this into your pages/Practice.tsx or use it as a reference for
 * plugging the engine into your existing page layout.
 */

import { useExamEngine } from "@/hooks/use-exam-engine";
import type { Question } from "@/hooks/use-exam-engine";
import { QuestionCard } from "@/components/practice/QuestionCard";
import { ExplanationPanel } from "@/components/practice/ExplanationPanel";
import { QuestionNavigator } from "@/components/practice/QuestionNavigator";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  questions: Question[];
  chapterId: string; // used in the remount key
  onSessionComplete?: (score: number, total: number) => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PracticeSession({ questions, chapterId, onSessionComplete }: Props) {
  const engine = useExamEngine(questions);

  const {
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    selectedOption,
    isChecked,
    isCorrect,
    showExplanation,
    confidenceSelection,
    mistakeTag,
    isFirstQuestion,
    isLastQuestion,
    score,
    selectOption,
    checkAnswer,
    nextQuestion,
    previousQuestion,
    setConfidence,
    setMistakeTag,
  } = engine;

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        No questions available for this chapter.
      </div>
    );
  }

  const handleSubmit = () => {
    onSessionComplete?.(score, totalQuestions);
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
      {/* Navigator (counter + progress + buttons) */}
      <QuestionNavigator
        currentIndex={currentQuestionIndex}
        totalQuestions={totalQuestions}
        isChecked={isChecked}
        selectedOption={selectedOption}
        isFirstQuestion={isFirstQuestion}
        isLastQuestion={isLastQuestion}
        onCheckAnswer={checkAnswer}
        onPrevious={previousQuestion}
        onNext={nextQuestion}
        onSubmit={handleSubmit}
      />

      {/*
       * BUG FIX 4: key forces full remount when question changes.
       * This guarantees no internal state leaks between questions.
       */}
      <QuestionCard
        key={`${chapterId}-${currentQuestion.id}`}
        question={currentQuestion}
        selectedOption={selectedOption}
        isChecked={isChecked}
        isCorrect={isCorrect}
        onSelectOption={selectOption}
      />

      {/* Explanation + confidence + mistake tagger — only after Check Answer */}
      {showExplanation && isCorrect !== null && (
        <ExplanationPanel
          explanation={currentQuestion.explanation}
          isCorrect={isCorrect}
          confidenceSelection={confidenceSelection}
          mistakeTag={mistakeTag}
          onSetConfidence={setConfidence}
          onSetMistakeTag={setMistakeTag}
        />
      )}
    </div>
  );
}
