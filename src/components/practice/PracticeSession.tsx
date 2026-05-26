/**
 * PracticeSession — Updated with Analytics (T5) + Adaptive Difficulty (T8)
 *
 * onSessionComplete now emits (score, results) so PracticePage
 * can pass per-question data to SessionResultsScreen.
 */

import { useEffect, useRef } from "react";
import { useExamEngine } from "@/hooks/use-exam-engine";
import { useAnalytics } from "@/hooks/use-analytics";
import { useAdaptiveEngine, getSessionLabel } from "@/hooks/use-adaptive-engine";
import type { Question } from "@/hooks/use-exam-engine";
import type { QuestionResult } from "@/components/practice/SessionResultsScreen";
import { QuestionCard } from "@/components/practice/QuestionCard";
import { ExplanationPanel } from "@/components/practice/ExplanationPanel";
import { QuestionNavigator } from "@/components/practice/QuestionNavigator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = {
  questions: Question[];
  chapterId: string;
  chapterName: string;
  subjectId: string;
  onSessionComplete?: (score: number, results: QuestionResult[]) => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PracticeSession({
  questions,
  chapterId,
  chapterName,
  subjectId,
  onSessionComplete,
}: Props) {
  // Analytics
  const analytics = useAnalytics();
  const chapterStats = analytics.getChapterStats(chapterId);

  // Adaptive ordering
  const adaptedQuestions = useAdaptiveEngine(questions, {
    chapterStats,
    wrongQuestionIds: [],
  });

  const sessionLabel = getSessionLabel(chapterStats?.accuracy ?? null);

  // Exam engine
  const engine = useExamEngine(adaptedQuestions);
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
    timeTakenMs,
    selectOption,
    checkAnswer,
    nextQuestion,
    previousQuestion,
    setConfidence,
    setMistakeTag,
  } = engine;

  // Collect results per question
  const resultsRef = useRef<QuestionResult[]>([]);

  // Record into analytics + collect result when answer is checked
  useEffect(() => {
    if (isChecked && currentQuestion && isCorrect !== null) {
      // Analytics
      analytics.recordAttempt({
        question: currentQuestion,
        chapterId,
        subjectId,
        chapterName,
        isCorrect,
        timeTakenMs,
      });

      // Collect result (avoid duplicates)
      const alreadyRecorded = resultsRef.current.some(
        (r) => r.question.id === currentQuestion.id
      );
      if (!alreadyRecorded) {
        resultsRef.current = [
          ...resultsRef.current,
          {
            question: currentQuestion,
            selectedOption,
            isCorrect,
            timeTakenMs,
          },
        ];
      }
    }
  }, [isChecked]);

  const handleSubmit = () => {
    onSessionComplete?.(score, resultsRef.current);
  };

  if (!currentQuestion) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        No questions available.
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
      {/* Adaptive mode badge */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{sessionLabel.emoji}</span>
        <span className="font-medium text-foreground">{sessionLabel.label}</span>
        <span>·</span>
        <span>{sessionLabel.description}</span>
      </div>

      {/* Navigator */}
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

      {/* Question card */}
      <QuestionCard
        key={`${chapterId}-${currentQuestion.id}`}
        question={currentQuestion}
        selectedOption={selectedOption}
        isChecked={isChecked}
        isCorrect={isCorrect}
        onSelectOption={selectOption}
      />

      {/* Explanation + confidence + mistake tagger */}
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
