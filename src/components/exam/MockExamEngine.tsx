import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { AnswerOptions } from "@/components/exam/AnswerOptions";
import { cn } from "@/lib/utils";
import { saveAttempt } from "@/engines/analytics/attemptLogger";
import {
  finaliseSession,
  updateAfterAttempt,
} from "@/engines/analytics/profileUpdater";
import type { Question, QuestionAttempt } from "@/types/question";

export type MockExamResult = {
  question: Question;
  selectedOption: string | null;
  isCorrect: boolean;
};

type Props = {
  questions: Question[];
  durationSeconds: number;
  title?: string;
  onSessionComplete?: (
    attempts: QuestionAttempt[],
    score: number,
    results: MockExamResult[],
  ) => void;
};

function formatTime(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60)
    .toString()
    .padStart(2, "0");
  const r = (s % 60).toString().padStart(2, "0");
  return `${m}:${r}`;
}

export function MockExamEngine({
  questions,
  durationSeconds,
  title = "Mock Exam",
  onSessionComplete,
}: Props) {
  const [phase, setPhase] = useState<"running" | "complete">("running");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [results, setResults] = useState<MockExamResult[]>([]);
  const [score, setScore] = useState(0);
  const startedAtRef = useRef(Date.now());
  const submittedRef = useRef(false);

  const submitExam = useCallback(() => {
    if (submittedRef.current || questions.length === 0) return;
    submittedRef.current = true;

    const elapsedMs = Date.now() - startedAtRef.current;
    const perQuestionMs = Math.round(elapsedMs / questions.length);
    const graded: MockExamResult[] = [];
    const attempts: QuestionAttempt[] = [];
    let totalScore = 0;

    for (const question of questions) {
      const selectedOption = answers[question.id] ?? null;
      const isCorrect =
        selectedOption !== null && selectedOption === question.correctAnswer;

      graded.push({ question, selectedOption, isCorrect });
      if (isCorrect) totalScore += question.marks;

      const attempt: QuestionAttempt = {
        questionId: question.id,
        chapterId: question.chapterId ?? "",
        subject: question.subject,
        concept: question.concept ?? "",
        timeTakenMs: perQuestionMs,
        selectedAnswer: selectedOption ?? "",
        isCorrect,
        confidenceLevel: "medium",
        attemptMode: "mock",
        timestamp: Date.now(),
      };

      saveAttempt(attempt);
      updateAfterAttempt(
        attempt.chapterId,
        attempt.concept,
        attempt.isCorrect,
        attempt.confidenceLevel,
        undefined,
        attempt.timeTakenMs,
      );
      attempts.push(attempt);
    }

    finaliseSession(
      attempts.map((a) => ({
        isCorrect: a.isCorrect,
        confidenceLevel: a.confidenceLevel,
      })),
    );

    setResults(graded);
    setScore(totalScore);
    setPhase("complete");
    onSessionComplete?.(attempts, totalScore, graded);
  }, [answers, onSessionComplete, questions]);

  useEffect(() => {
    if (phase !== "running") return;
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          submitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [phase, submitExam]);

  useEffect(() => {
    setCurrentIndex(0);
    setAnswers({});
    setTimeLeft(durationSeconds);
    setPhase("running");
    setResults([]);
    setScore(0);
    submittedRef.current = false;
    startedAtRef.current = Date.now();
  }, [durationSeconds, questions]);

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-4xl mb-3">📭</p>
        <p className="text-sm">No questions available for this mock exam.</p>
      </div>
    );
  }

  if (phase === "complete") {
    const correctCount = results.filter((r) => r.isCorrect).length;
    const wrongCount = results.length - correctCount;
    const accuracy = Math.round((correctCount / results.length) * 100);

    return (
      <div className="flex flex-col items-center gap-6 py-10 px-4 text-center">
        <div className="text-5xl">
          {accuracy >= 80 ? "🎉" : accuracy >= 50 ? "👍" : "💪"}
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {title} complete
          </p>
          <p className="text-2xl font-medium text-foreground mt-1">{accuracy}%</p>
          <p className="text-sm text-muted-foreground mt-1">
            {correctCount} correct · {wrongCount} wrong · {score} marks ·{" "}
            {results.length} questions
          </p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  if (!currentQuestion) return null;

  const selectedOption = answers[currentQuestion.id] ?? null;
  const answeredCount = Object.keys(answers).length;
  const isLowTime = timeLeft <= 300;
  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto px-4 pb-10">
      <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <Clock
            className={cn(
              "h-4 w-4",
              isLowTime ? "text-red-500" : "text-muted-foreground",
            )}
          />
          <span
            className={cn(
              "font-mono text-lg font-bold tabular-nums",
              isLowTime ? "text-red-600 dark:text-red-400" : "text-foreground",
            )}
          >
            {formatTime(timeLeft)}
          </span>
          {isLowTime && (
            <span className="text-xs font-medium text-red-500">Low time</span>
          )}
        </div>
        <span className="text-sm text-muted-foreground">
          {answeredCount}/{questions.length} answered
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {questions.map((q, idx) => (
          <button
            key={q.id}
            type="button"
            onClick={() => setCurrentIndex(idx)}
            className={cn(
              "h-8 w-8 rounded-lg text-xs font-medium border transition-all",
              idx === currentIndex
                ? "border-foreground bg-foreground text-background scale-110"
                : answers[q.id]
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-foreground/40",
            )}
            aria-label={`Go to question ${idx + 1}`}
            aria-current={idx === currentIndex ? "true" : undefined}
          >
            {idx + 1}
          </button>
        ))}
      </div>

      <article className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{currentQuestion.subject}</span>
          <span>·</span>
          <span>{currentQuestion.chapter}</span>
          <span>·</span>
          <span>{currentQuestion.marks} mark(s)</span>
        </div>

        <p className="text-base font-medium leading-relaxed text-foreground">
          {currentQuestion.question}
        </p>

        {(currentQuestion.options?.length ?? 0) > 0 ? (
          <AnswerOptions
            options={currentQuestion.options ?? []}
            selectedOption={selectedOption}
            correctAnswer={currentQuestion.correctAnswer}
            isChecked={false}
            onSelect={(option) =>
              setAnswers((prev) => ({ ...prev, [currentQuestion.id]: option }))
            }
          />
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            This question has no selectable options.
          </p>
        )}
      </article>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
          disabled={currentIndex === 0}
          className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground hover:border-foreground/40 disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        <div className="flex-1" />

        {!isLastQuestion ? (
          <button
            type="button"
            onClick={() =>
              setCurrentIndex((i) => Math.min(i + 1, questions.length - 1))
            }
            className="flex items-center gap-1.5 rounded-xl bg-foreground px-5 py-2 text-sm font-medium text-background"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submitExam}
            className="rounded-xl bg-green-700 px-5 py-2 text-sm font-medium text-white hover:bg-green-800"
          >
            Submit exam
          </button>
        )}
      </div>

      {answeredCount === questions.length && !isLastQuestion && (
        <button
          type="button"
          onClick={submitExam}
          className="w-full rounded-xl border border-green-300 bg-green-50 py-2.5 text-sm font-medium text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
        >
          All answered — submit early
        </button>
      )}
    </div>
  );
}
