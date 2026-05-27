/**
 * PracticeSession — adaptive practice via AdaptivePracticeEngine.
 */

import { useMemo } from "react";
import { AdaptivePracticeEngine } from "@/components/exam/AdaptivePracticeEngine";
import type { QuestionResult } from "@/components/practice/SessionResultsScreen";
import {
  mapSubjectIdToEngineSubject,
  toEngineQuestions,
  type BankQuestion,
} from "@/lib/migrated-question-bank";
import type { QuestionAttempt } from "@/types/question";

type Props = {
  questions: BankQuestion[];
  chapterId: string;
  chapterName: string;
  subjectId: string;
  onSessionComplete?: (score: number, results: QuestionResult[]) => void;
};

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

export function PracticeSession({
  questions,
  chapterId,
  subjectId,
  onSessionComplete,
}: Props) {
  const bankById = useMemo(
    () => new Map(questions.map((q) => [q.id, q])),
    [questions],
  );

  const engineQuestions = useMemo(() => toEngineQuestions(questions), [questions]);

  const subject = mapSubjectIdToEngineSubject(subjectId);

  const handleComplete = (attempts: QuestionAttempt[], score: number) => {
    onSessionComplete?.(score, toQuestionResults(attempts, bankById));
  };

  return (
    <AdaptivePracticeEngine
      questions={engineQuestions}
      chapterId={chapterId}
      subject={subject}
      sessionLength={10}
      onSessionComplete={handleComplete}
    />
  );
}
