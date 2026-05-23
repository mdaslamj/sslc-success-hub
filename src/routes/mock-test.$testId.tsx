import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Flag,
  RotateCcw,
  XCircle,
  Heart,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  gradeTest,
  buildRetryWrongTest,
  computeChapterBreakdown,
  type ChapterBreakdownRow,
  type MockTest,
  type MockTestResult,
} from "@/lib/mock-test/engine";
import {
  cacheTest,
  readCachedTest,
  recordAttempt,
} from "@/lib/mock-test/store";
import { recordAttemptSignals } from "@/lib/weakAreaTracker";
import { getEmotionalSummary } from "@/lib/emotionalProgress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mock-test/$testId")({
  head: () => ({
    meta: [{ title: "Mock Test — Aura" }],
  }),
  component: MockTestRunner,
});

type Phase = "test" | "review";

function MockTestRunner() {
  const { testId } = Route.useParams();
  const navigate = useNavigate();
  const [test] = useState<MockTest | null>(() => readCachedTest(testId));
  if (!test) {
    return (
      <DashboardLayout title="Mock Test">
        <div className="mx-auto max-w-md space-y-3 px-4 py-12 text-center">
          <h1 className="text-lg font-semibold">Test not found</h1>
          <p className="text-sm text-muted-foreground">
            This mock test isn’t cached on this device. Start a new one from the mock test page.
          </p>
          <Button asChild>
            <Link to="/mock-test">Back to mock tests</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }
  return <ActiveRunner test={test} onExit={() => navigate({ to: "/mock-test" })} />;
}

function ActiveRunner({ test, onExit }: { test: MockTest; onExit: () => void }) {
  const [answers, setAnswers] = useState<(number | null)[]>(() =>
    test ? test.questions.map(() => null) : [],
  );
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("test");
  const [secondsLeft, setSecondsLeft] = useState<number>(test.durationSeconds);
  const [result, setResult] = useState<MockTestResult | null>(null);
  const [startedAt] = useState<number>(() => Date.now());

  // Countdown timer
  useEffect(() => {
    if (phase !== "test") return;
    if (secondsLeft <= 0) {
      submit();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, phase]);

  const total = test.questions.length;
  const q = test.questions[idx];
  const answered = answers.filter((a) => a != null).length;

  function pick(option: number) {
    setAnswers((prev) => {
      const next = [...prev];
      next[idx] = option;
      return next;
    });
  }

  function submit() {
    if (phase === "review") return;
    const r = gradeTest(test, answers);
    setResult(r);
    setPhase("review");
    recordAttempt({
      testId: test.id,
      kind: test.kind,
      subjectId: test.subjectId,
      subjectName: test.subjectName,
      chapterId: test.chapterId,
      title: test.title,
      endedAt: Date.now(),
      durationSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
      result: r,
    });
    // Local-only weak-area signals — wrong qs, chapter accuracy, confidence.
    recordAttemptSignals({ test, answers });
  }

  if (phase === "review" && result) {
    return (
      <ReviewView
        test={test}
        answers={answers}
        result={result}
        onRestart={onExit}
      />
    );
  }

  return (
    <DashboardLayout title={test.title}>
      <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-4">
        {/* Header */}
        <header className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Badge variant="outline" className="rounded-full">
              {test.kind === "chapter" ? "Chapter Test" : "Subject Test"}
            </Badge>
            <h1 className="mt-1 truncate text-base font-semibold">{test.title}</h1>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-sm tabular-nums">
            <Clock className="h-4 w-4 text-muted-foreground" />
            {formatTime(secondsLeft)}
          </div>
        </header>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Question {idx + 1} of {total}</span>
            <span>{answered}/{total} answered</span>
          </div>
          <Progress value={((idx + 1) / total) * 100} className="h-1.5" />
        </div>

        {/* Question */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground">{q.chapterTitle}</div>
          <p className="mt-2 text-sm font-medium leading-relaxed">{q.question}</p>
          <div className="mt-4 space-y-2">
            {q.options.map((opt, i) => {
              const selected = answers[idx] === i;
              return (
                <button
                  key={i}
                  onClick={() => pick(i)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm transition-colors",
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/40",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full border text-xs font-semibold",
                      selected ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground",
                    )}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Nav */}
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Prev
          </Button>
          {idx < total - 1 ? (
            <Button size="sm" onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}>
              Next <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button size="sm" onClick={submit}>
              <Flag className="mr-1 h-4 w-4" /> Submit
            </Button>
          )}
        </div>

        {/* Question pills */}
        <div className="flex flex-wrap gap-1.5">
          {test.questions.map((_, i) => {
            const isAnswered = answers[i] != null;
            const isCurrent = i === idx;
            return (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={cn(
                  "h-7 w-7 rounded-md border text-xs font-medium",
                  isCurrent
                    ? "border-primary bg-primary text-primary-foreground"
                    : isAnswered
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "border-border bg-card text-muted-foreground",
                )}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        <div className="pt-2 text-center">
          <Button variant="ghost" size="sm" onClick={submit}>
            Submit early
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

function ReviewView({
  test,
  answers,
  result,
  onRestart,
}: {
  test: MockTest;
  answers: (number | null)[];
  result: MockTestResult;
  onRestart: () => void;
}) {
  const navigate = useNavigate();
  const breakdown = useMemo(
    () => computeChapterBreakdown(test, answers),
    [test, answers],
  );
  const wrongCount = test.questions.reduce((n, q, i) => {
    const a = answers[i];
    return n + (a == null || a !== q.correctIndex ? 1 : 0);
  }, 0);
  const supportive = supportiveMessage(result.scorePct);
  const emotional = useMemo(() => getEmotionalSummary(), []);
  const weakChapters = breakdown
    .filter((b) => b.accuracyPct < 60)
    .sort((a, b) => a.accuracyPct - b.accuracyPct);

  function retryWrong() {
    const retry = buildRetryWrongTest(test, answers);
    if (!retry) return;
    cacheTest(retry);
    navigate({ to: "/mock-test/$testId", params: { testId: retry.id } });
  }

  return (
    <DashboardLayout title={`${test.title} — Review`}>
      <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-4">
        <header className="space-y-1">
          <Badge variant="outline" className="rounded-full">Result</Badge>
          <h1 className="text-xl font-semibold">{test.title}</h1>
          <p className="text-sm text-muted-foreground">{supportive}</p>
        </header>

        <div className="grid grid-cols-3 gap-2">
          <ResultCard label="Score" value={`${result.scorePct}%`} />
          <ResultCard label="Correct" value={`${result.correct}/${result.total}`} />
          <ResultCard label="To revisit" value={String(wrongCount)} />
        </div>

        {/* Emotional progress note — calm, learning-signal aware */}
        <div className="flex items-start gap-2 rounded-2xl border border-border/60 bg-card/60 p-3 text-xs text-muted-foreground">
          <Heart className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
          <p className="leading-snug">
            {emotional.headline} {emotional.confidence}
          </p>
        </div>

        {/* Action row — retry wrong + back */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {wrongCount > 0 ? (
            <Button size="sm" onClick={retryWrong}>
              <RotateCcw className="mr-1 h-4 w-4" /> Retry wrong ({wrongCount})
            </Button>
          ) : null}
          <Button size="sm" variant="outline" onClick={onRestart}>
            Back to mock tests
          </Button>
        </div>

        {/* Chapter breakdown */}
        {breakdown.length > 1 ? (
          <section className="rounded-2xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">Chapter breakdown</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              A calm look at how each chapter went — not a score, just a guide.
            </p>
            <ul className="mt-3 space-y-2">
              {breakdown.map((b) => (
                <BreakdownRow key={b.chapterId} row={b} />
              ))}
            </ul>
          </section>
        ) : null}

        {/* Gentle revision suggestion */}
        {weakChapters.length > 0 ? (
          <section className="rounded-2xl border border-amber-400/30 bg-amber-50/40 p-4 dark:bg-amber-500/5">
            <h2 className="text-sm font-semibold">A gentle next step</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              No pressure — when you’re ready, a short revisit of these will help
              the most.
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {weakChapters.slice(0, 3).map((b) => (
                <li key={b.chapterId} className="flex items-center justify-between gap-2">
                  <span className="truncate">{b.chapterTitle}</span>
                  <span className="text-xs text-muted-foreground">{b.accuracyPct}%</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <ol className="space-y-3">
          {test.questions.map((q, i) => {
            const sel = answers[i];
            const isCorrect = sel === q.correctIndex;
            return (
              <li key={q.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xs text-muted-foreground">
                    Q{i + 1} · {q.chapterTitle}
                  </div>
                  {sel == null ? (
                    <Badge variant="secondary">Skipped</Badge>
                  ) : isCorrect ? (
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Correct
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="mr-1 h-3 w-3" /> Wrong
                    </Badge>
                  )}
                </div>
                <p className="mt-2 text-sm font-medium">{q.question}</p>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {q.options.map((opt, oi) => {
                    const isAns = oi === q.correctIndex;
                    const isPick = oi === sel;
                    return (
                      <li
                        key={oi}
                        className={cn(
                          "flex items-start gap-2 rounded-lg border p-2",
                          isAns
                            ? "border-emerald-500/40 bg-emerald-500/5"
                            : isPick
                              ? "border-destructive/40 bg-destructive/5"
                              : "border-border",
                        )}
                      >
                        <span className="mt-0.5 text-xs font-semibold text-muted-foreground">
                          {String.fromCharCode(65 + oi)}
                        </span>
                        <span className="flex-1">{opt}</span>
                        {isAns ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : isPick ? (
                          <XCircle className="h-4 w-4 text-destructive" />
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
                {q.explanation ? (
                  <p className="mt-2 rounded-lg bg-muted/40 p-2 text-xs text-muted-foreground">
                    {q.explanation}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>

        <div className="flex flex-wrap justify-center gap-2 pt-2">
          {wrongCount > 0 ? (
            <Button onClick={retryWrong}>
              <RotateCcw className="mr-1 h-4 w-4" /> Retry wrong questions
            </Button>
          ) : null}
          <Button variant="outline" onClick={onRestart}>
            Back to mock tests
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

function BreakdownRow({ row }: { row: ChapterBreakdownRow }) {
  return (
    <li className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="min-w-0 truncate">{row.chapterTitle}</span>
        <span className="tabular-nums text-xs text-muted-foreground">
          {row.correct}/{row.total} · {row.accuracyPct}%
        </span>
      </div>
      <Progress value={row.accuracyPct} className="h-1.5" />
    </li>
  );
}

function supportiveMessage(pct: number): string {
  if (pct >= 85) return "Lovely work — you’re owning this. Keep the rhythm gentle.";
  if (pct >= 65) return "Solid effort. A short revisit of the trickier ones and you’re set.";
  if (pct >= 40) return "Good attempt — every wrong answer is a hint, not a verdict.";
  return "Be kind to yourself. Tests are practice. Let’s revisit a few topics calmly.";
}

function ResultCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function formatTime(secs: number): string {
  const s = Math.max(0, secs | 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}