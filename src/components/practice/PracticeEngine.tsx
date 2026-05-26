import { useMemo } from "react";
import { PracticeEngine as ExamPracticeEngine } from "@/components/exam/PracticeEngine";
import { useAnalytics } from "@/hooks/use-analytics";
import { getSessionLabel, useAdaptiveEngine } from "@/hooks/use-adaptive-engine";
import type { Question as BankQuestion } from "@/hooks/use-exam-engine";
import type { QuestionResult } from "@/components/practice/SessionResultsScreen";
import type { Question, QuestionAttempt } from "@/types/question";

type Props = {
  questions: BankQuestion[];
  chapterId: string;
  chapterName: string;
  subjectId: string;
  onSessionComplete?: (score: number, results: QuestionResult[]) => void;
};

function toEngineQuestion(
  question: BankQuestion,
  chapterId: string,
  subjectId: string,
): Question {
  return {
    id: question.id,
    subject: subjectId,
    chapter: question.chapter || chapterNameFallback(chapterId, question.chapter),
    chapterId,
    concept: question.concept,
    difficulty: question.difficulty,
    questionType: question.questionType,
    marks: question.marks,
    question: question.question,
    options: question.options,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    estimatedTime: question.estimatedTime,
    cognitiveLevel: question.cognitiveLevel,
    commonMistakes: question.commonMistakes,
  };
}

function chapterNameFallback(chapterId: string, chapter?: string): string {
  return chapter || chapterId.replace(/[-_]/g, " ");
}

function toQuestionResults(
  attempts: QuestionAttempt[],
  bankById: Map<string, BankQuestion>,
): QuestionResult[] {
  return attempts.flatMap((attempt) => {
    const question = bankById.get(attempt.questionId);
    if (!question) return [];
    return [
      {
        question,
        selectedOption: attempt.selectedAnswer || null,
        isCorrect: attempt.isCorrect,
        timeTakenMs: attempt.timeTakenMs,
      },
    ];
  });
}

export function PracticeEngine({
  questions,
  chapterId,
  chapterName,
  subjectId,
  onSessionComplete,
}: Props) {
  const analytics = useAnalytics();
  const chapterStats = analytics.getChapterStats(chapterId);
  const adaptedQuestions = useAdaptiveEngine(questions, {
    chapterStats,
    wrongQuestionIds: [],
  });
  const sessionLabel = getSessionLabel(chapterStats?.accuracy ?? null);

  const bankById = useMemo(
    () => new Map(adaptedQuestions.map((q) => [q.id, q])),
    [adaptedQuestions],
  );

  const engineQuestions = useMemo(
    () =>
      adaptedQuestions.map((q) =>
        toEngineQuestion(
          { ...q, chapter: q.chapter || chapterName },
          chapterId,
          subjectId,
        ),
      ),
    [adaptedQuestions, chapterId, chapterName, subjectId],
  );

  const handleComplete = (attempts: QuestionAttempt[], score: number) => {
    onSessionComplete?.(score, toQuestionResults(attempts, bankById));
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{sessionLabel.emoji}</span>
        <span className="font-medium text-foreground">{sessionLabel.label}</span>
        <span>·</span>
        <span>{sessionLabel.description}</span>
      </div>

      <ExamPracticeEngine
        questions={engineQuestions}
        chapterId={chapterId}
        onSessionComplete={handleComplete}
      />
    </div>
  );
}
