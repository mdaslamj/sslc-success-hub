import { useEffect, useMemo, useState } from "react";
import { Link, useSearch } from "@tanstack/react-router";
import { Loader2, RefreshCcw, CheckCircle2, XCircle } from "lucide-react";
import { loadChapter } from "@/lib/contentLoader";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";

interface MCQ {
  id: string;
  question: string;
  options: string[];
  answer?: string;
  correctAnswer?: string;
  explanation?: string;
}

interface Chapter {
  title: string;
  summary: string;
  learningPoints?: string[];
  mcqs: MCQ[];
}

export default function ChapterTest() {
  const search = useSearch({ strict: false }) as {
    subject?: string;
    chapter?: string;
  };
  const subjectFolder = search.subject ?? "mathematics";
  const chapterId = search.chapter ?? "real-numbers";
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setChapter(null);
    setError(null);
    setAnswers({});
    setSubmitted(false);
    loadChapter(subjectFolder, chapterId)
      .then((c) => {
        if (!cancelled) setChapter(c);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? "Chapter unavailable.");
      });
    return () => {
      cancelled = true;
    };
  }, [subjectFolder, chapterId]);

  const results = useMemo(() => {
    if (!chapter) return { total: 0, correct: 0 };
    const correct = chapter.mcqs.reduce((count, mcq) => {
      const picked = answers[mcq.id];
      const expected = mcq.correctAnswer ?? mcq.answer;
      if (picked == null || !expected) return count;
      return mcq.options[picked] === expected ? count + 1 : count;
    }, 0);
    return { total: chapter.mcqs.length, correct };
  }, [answers, chapter]);

  function retry() {
    setAnswers({});
    setSubmitted(false);
  }

  if (error) {
    return (
      <DashboardLayout title="Chapter Test">
        <div className="mx-auto max-w-md rounded-3xl border border-border/60 bg-card p-6 text-center shadow-card">
          <p className="text-sm text-destructive">Error: {error}</p>
          <Link to="/quizzes">
            <Button className="mt-4 rounded-full">Back to quizzes</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  if (!chapter) {
    return (
      <DashboardLayout title="Chapter Test">
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Chapter Test">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold sm:text-3xl">{chapter.title}</h1>
          <p className="text-sm text-muted-foreground sm:text-base">{chapter.summary}</p>
        </header>

        {submitted && (
          <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Result</p>
                <p className="mt-1 text-2xl font-bold">{results.correct}/{results.total} correct</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="rounded-full" onClick={retry}>
                  <RefreshCcw className="mr-1 h-4 w-4" /> Retry
                </Button>
                <Link to="/quizzes">
                  <Button className="rounded-full">Back to quizzes</Button>
                </Link>
              </div>
            </div>
          </section>
        )}

        <section className="space-y-4">
          <h2 className="text-lg font-semibold sm:text-xl">Questions ({chapter.mcqs.length})</h2>
          <ol className="space-y-4">
            {chapter.mcqs.map((mcq, qIndex) => {
              const selectedIndex = answers[mcq.id];
              const expected = mcq.correctAnswer ?? mcq.answer;
              return (
                <li key={mcq.id} className="rounded-3xl border border-border/60 bg-card p-4 shadow-card sm:p-5">
                  <p className="font-medium leading-relaxed">
                    {qIndex + 1}. {mcq.question}
                  </p>
                  <div className="mt-4 grid gap-2">
                    {mcq.options.map((opt, i) => {
                      const chosen = selectedIndex === i;
                      const correct = submitted && expected === opt;
                      const wrong = submitted && chosen && expected !== opt;
                      return (
                        <button
                          key={i}
                          type="button"
                          disabled={submitted}
                          onClick={() => setAnswers((prev) => ({ ...prev, [mcq.id]: i }))}
                          className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                            correct
                              ? "border-success bg-success/10"
                              : wrong
                                ? "border-destructive bg-destructive/10"
                                : chosen
                                  ? "border-foreground bg-foreground/5"
                                  : "border-border/60 bg-background/40"
                          }`}
                        >
                          <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                            {String.fromCharCode(65 + i)}
                          </span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {submitted && expected && (
                    <div className="mt-3 flex items-start gap-2 text-sm">
                      {selectedIndex != null && chapter.mcqs[qIndex].options[selectedIndex] === expected ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      ) : (
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                      )}
                      <div className="text-muted-foreground">
                        Correct answer: <span className="font-medium text-foreground">{expected}</span>
                        {mcq.explanation ? <p className="mt-1 text-xs">{mcq.explanation}</p> : null}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        {!submitted ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <Link to="/quizzes">
              <Button variant="outline" className="w-full rounded-full sm:w-auto">Back to quizzes</Button>
            </Link>
            <Button
              className="w-full rounded-full sm:w-auto"
              onClick={() => setSubmitted(true)}
              disabled={Object.keys(answers).length !== chapter.mcqs.length}
            >
              Submit test
            </Button>
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  );
}