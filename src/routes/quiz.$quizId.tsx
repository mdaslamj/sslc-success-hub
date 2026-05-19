import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Pause,
  Play,
  RefreshCcw,
  X,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuiz } from "@/hooks/use-quiz";
import { readCachedQuiz } from "@/lib/quiz-store";
import type { QuizDoc } from "@/integrations/firebase/types";

export const Route = createFileRoute("/quiz/$quizId")({
  head: () => ({
    meta: [
      { title: "Quiz — VidyaPath" },
      {
        name: "description",
        content: "Take a chapter quiz, review your answers, and earn XP.",
      },
    ],
  }),
  component: QuizPlayerPage,
});

function QuizPlayerPage() {
  const { quizId } = Route.useParams();
  const [quiz, setQuiz] = useState<QuizDoc | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const q = readCachedQuiz(quizId);
    if (q) setQuiz(q);
    else setMissing(true);
  }, [quizId]);

  if (missing) {
    return (
      <DashboardLayout title="Quiz">
        <div className="mx-auto max-w-md rounded-3xl border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
          <p>This quiz is no longer in your local cache.</p>
          <Link to="/quizzes">
            <Button className="mt-4 rounded-full">Back to Quizzes</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  if (!quiz) {
    return (
      <DashboardLayout title="Quiz">
        <div className="mx-auto max-w-md rounded-3xl border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      </DashboardLayout>
    );
  }

  return <Player quiz={quiz} />;
}

function Player({ quiz }: { quiz: QuizDoc }) {
  const navigate = useNavigate();
  const c = useQuiz(quiz);
  const q = quiz.questions[c.index];
  const answered = c.answers[c.index];

  const timed = quiz.durationSeconds > 0;
  const timerLabel = useMemo(() => formatTime(c.timeSeconds), [c.timeSeconds]);

  // Auto-start on first render so users don't see an empty shell.
  useEffect(() => {
    if (c.phase === "idle") c.start();
  }, [c]);

  if (c.phase === "completed" && c.attempt) {
    return <Review quiz={quiz} attempt={c.attempt} />;
  }

  return (
    <DashboardLayout title={quiz.title}>
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            Question {c.index + 1} of {quiz.questions.length}
          </div>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1 text-xs font-medium tabular-nums",
                timed && c.timeSeconds <= 10 && "text-destructive",
              )}
            >
              <Clock className="h-3 w-3" />
              {timerLabel}
            </div>
            {c.phase === "running" ? (
              <Button size="sm" variant="outline" onClick={c.pause} className="rounded-full">
                <Pause className="h-3 w-3" />
              </Button>
            ) : c.phase === "paused" ? (
              <Button size="sm" variant="outline" onClick={c.resume} className="rounded-full">
                <Play className="h-3 w-3" />
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border/40">
          <div
            className="h-full bg-foreground transition-all"
            style={{
              width: `${((c.index + 1) / quiz.questions.length) * 100}%`,
            }}
          />
        </div>

        <div className="mt-6 rounded-3xl border border-border/60 bg-card p-6 shadow-card">
          <h2 className="font-display text-lg font-semibold leading-snug">
            {q.question}
          </h2>
          <div className="mt-5 grid gap-2">
            {q.options.map((opt, i) => {
              const selected = answered?.selectedIndex === i;
              return (
                <button
                  key={i}
                  onClick={() => c.select(i)}
                  disabled={c.phase !== "running"}
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-left text-sm transition-colors",
                    selected
                      ? "border-foreground bg-foreground/5"
                      : "border-border/60 hover:border-foreground/40",
                    c.phase !== "running" && "opacity-60",
                  )}
                >
                  <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                    {String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <Button
            variant="outline"
            onClick={c.prev}
            disabled={c.index === 0}
            className="rounded-full"
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Prev
          </Button>
          {c.index < quiz.questions.length - 1 ? (
            <Button onClick={c.next} className="rounded-full">
              Next <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={() => {
                const a = c.submit();
                if (a) {
                  /* triggers Review render via phase change */
                }
              }}
              className="rounded-full"
            >
              Submit <Check className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => navigate({ to: "/quizzes" })}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Exit quiz
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Review({
  quiz,
  attempt,
}: {
  quiz: QuizDoc;
  attempt: import("@/integrations/firebase/types").QuizAttemptDoc;
}) {
  return (
    <DashboardLayout title="Quiz Results">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {quiz.title}
          </p>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="font-display text-4xl font-bold tabular-nums">
              {attempt.accuracy}%
            </span>
            <span className="text-sm text-muted-foreground">
              {attempt.score} / {attempt.total} correct
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-muted px-2 py-1">
              +{attempt.xpAwarded} XP
            </span>
            <span className="rounded-full bg-muted px-2 py-1">
              {Math.round(attempt.durationSeconds / 60)} min
            </span>
            <span className="rounded-full bg-muted px-2 py-1">
              {attempt.completion}% completed
            </span>
          </div>
          {attempt.weakTopics.length > 0 && (
            <div className="mt-4 rounded-2xl bg-destructive/5 p-3 text-xs">
              <p className="font-semibold text-destructive">Revisit:</p>
              <p className="mt-1 text-muted-foreground">
                {attempt.weakTopics.join(" · ")}
              </p>
            </div>
          )}
        </div>

        <ol className="mt-6 space-y-3">
          {quiz.questions.map((q, i) => {
            const a = attempt.answers[i];
            const right = a?.correct;
            return (
              <li
                key={q.mcqId}
                className="rounded-2xl border border-border/60 bg-card p-4"
              >
                <div className="flex items-start gap-2">
                  <span
                    className={cn(
                      "mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px]",
                      right
                        ? "bg-success/15 text-success"
                        : "bg-destructive/15 text-destructive",
                    )}
                  >
                    {right ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {i + 1}. {q.question}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Correct: {q.options[q.correctIndex]}
                      {a?.selectedIndex != null && !right && (
                        <> · Your answer: {q.options[a.selectedIndex]}</>
                      )}
                    </p>
                    {q.explanation && (
                      <p className="mt-1 text-xs text-muted-foreground/80">
                        {q.explanation}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-6 flex justify-center gap-2">
          <Link to="/quizzes">
            <Button variant="outline" className="rounded-full">
              <RefreshCcw className="mr-1 h-4 w-4" /> Try another
            </Button>
          </Link>
          <Link to="/analytics">
            <Button className="rounded-full">View analytics</Button>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}