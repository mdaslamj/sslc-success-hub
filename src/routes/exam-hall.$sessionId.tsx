import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Flag,
  Send,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useExamHall } from "@/hooks/use-exam-hall";
import { cn } from "@/lib/utils";
import type {
  ExamHallQuestion,
  ExamHallSection,
  InvigilatorEventDoc,
} from "@/integrations/firebase/types";

export const Route = createFileRoute("/exam-hall/$sessionId")({
  head: () => ({
    meta: [
      { title: "Exam Hall in session — Aura" },
      {
        name: "description",
        content: "Immersive SSLC board exam simulation in progress.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ExamHallSession,
});

function formatTime(sec: number) {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`
    : `${m}:${String(r).padStart(2, "0")}`;
}

function ExamHallSession() {
  const { sessionId } = Route.useParams();
  const {
    loading,
    session,
    events,
    result,
    remainingSec,
    updateAnswer,
    goTo,
    flagCurrent,
    bumpAntiCheat,
    submit,
  } = useExamHall(sessionId);

  const [showSubmit, setShowSubmit] = useState(false);

  // Anti-cheat: blur + paste + fullscreen exits
  useEffect(() => {
    if (!session || session.status !== "in_progress") return;
    const onBlur = () => bumpAntiCheat("blurEvents");
    const onPaste = () => bumpAntiCheat("pasteEvents");
    const onFs = () => {
      if (!document.fullscreenElement) bumpAntiCheat("fullscreenExits");
    };
    window.addEventListener("blur", onBlur);
    window.addEventListener("paste", onPaste);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("paste", onPaste);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, [session?.id, session?.status, bumpAntiCheat]);

  // Auto-submit transition
  useEffect(() => {
    if (!session) return;
    if (session.status === "auto_submitted" && !result) {
      void submit();
    }
  }, [session?.status, result, submit]);

  if (loading || !session) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background text-sm text-muted-foreground">
        Loading exam hall…
      </div>
    );
  }

  if (session.status === "submitted" || result) {
    return <ResultView />;
  }

  const section: ExamHallSection = session.sections[session.cursor.sectionIndex];
  const question: ExamHallQuestion =
    section.questions[session.cursor.questionIndex];
  const answer = session.answers[question.id];
  const latestEvent = events[events.length - 1];
  const isLast =
    session.cursor.sectionIndex === session.sections.length - 1 &&
    session.cursor.questionIndex === section.questions.length - 1;
  const isFirst =
    session.cursor.sectionIndex === 0 && session.cursor.questionIndex === 0;

  const next = () => {
    if (session.cursor.questionIndex < section.questions.length - 1) {
      goTo(session.cursor.sectionIndex, session.cursor.questionIndex + 1);
    } else if (session.cursor.sectionIndex < session.sections.length - 1) {
      goTo(session.cursor.sectionIndex + 1, 0);
    }
  };
  const prev = () => {
    if (session.cursor.questionIndex > 0) {
      goTo(session.cursor.sectionIndex, session.cursor.questionIndex - 1);
    } else if (session.cursor.sectionIndex > 0) {
      const prevSec = session.sections[session.cursor.sectionIndex - 1];
      goTo(session.cursor.sectionIndex - 1, prevSec.questions.length - 1);
    }
  };

  const totalProgress =
    session.totalDurationSec > 0
      ? Math.min(100, (session.elapsedSec / session.totalDurationSec) * 100)
      : 0;

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      {/* Top bar — minimal exam-mode chrome */}
      <header className="sticky top-0 z-10 border-b border-border/60 bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Board Exam Hall
            </div>
            <div className="truncate text-sm font-semibold">{session.title}</div>
          </div>
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-sm tabular-nums",
              remainingSec < 5 * 60
                ? "border-destructive/40 text-destructive"
                : "border-border/60",
            )}
          >
            <Timer className="h-3.5 w-3.5" />
            {formatTime(remainingSec)}
          </div>
        </div>
        <Progress value={totalProgress} className="h-1 rounded-none" />
      </header>

      {/* Guidance banner */}
      {latestEvent && Date.now() - latestEvent.createdAt < 30_000 && (
        <InvigilatorBanner event={latestEvent} />
      )}

      <main className="mx-auto max-w-3xl space-y-5 px-4 py-5">
        {/* Section tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4">
          {session.sections.map((sec, i) => (
            <button
              key={sec.id}
              onClick={() => goTo(i, 0)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
                i === session.cursor.sectionIndex
                  ? "border-foreground bg-foreground text-background"
                  : "border-border/60 text-muted-foreground hover:text-foreground",
              )}
            >
              {sec.title.split("·")[0].trim()}
            </button>
          ))}
        </div>

        {/* Question card */}
        <article className="rounded-3xl border border-border/60 bg-card p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
              {section.title} · Q{session.cursor.questionIndex + 1}/{section.questions.length}
            </div>
            <Badge variant="outline" className="rounded-full">
              {question.marks} marks
            </Badge>
          </div>
          <p className="mt-3 text-base leading-relaxed">{question.prompt}</p>
          {question.keywords && question.keywords.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
              {question.keywords.map((k) => (
                <span key={k} className="rounded-full bg-muted px-2 py-0.5">
                  {k}
                </span>
              ))}
            </div>
          )}
          <Textarea
            value={answer?.text ?? ""}
            onChange={(e) => updateAnswer(question.id, e.target.value)}
            placeholder={
              question.kind === "mcq"
                ? "Type your selected option (a / b / c / d)…"
                : "Write your answer here. Number your steps."
            }
            rows={question.kind === "long" || question.kind === "diagram" ? 10 : 5}
            className="mt-4 resize-y rounded-2xl"
          />
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {answer?.timeSpentSec
                ? `${formatTime(answer.timeSpentSec)} on this question`
                : "Just started"}
            </span>
            <button
              onClick={() => flagCurrent(!answer?.flagged)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
                answer?.flagged
                  ? "border-amber-500/60 text-amber-600"
                  : "border-border/60",
              )}
            >
              <Flag className="h-3 w-3" />
              {answer?.flagged ? "Flagged" : "Flag for review"}
            </button>
          </div>
        </article>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="flex-1 rounded-full"
            onClick={prev}
            disabled={isFirst}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>
          {isLast ? (
            <Button
              className="flex-1 rounded-full gap-2"
              onClick={() => setShowSubmit(true)}
            >
              <Send className="h-4 w-4" />
              Submit
            </Button>
          ) : (
            <Button className="flex-1 rounded-full" onClick={next}>
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Question grid navigator */}
        <QuestionGrid />

        <div className="text-center">
          <button
            onClick={() => setShowSubmit(true)}
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            Submit exam early
          </button>
        </div>
      </main>

      {showSubmit && (
        <SubmitDialog
          onCancel={() => setShowSubmit(false)}
          onConfirm={async () => {
            setShowSubmit(false);
            await submit();
          }}
        />
      )}
    </div>
  );

  function QuestionGrid() {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-3">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Answer sheet
        </div>
        <div className="mt-2 space-y-2">
          {session!.sections.map((sec, si) => (
            <div key={sec.id}>
              <div className="text-[10px] text-muted-foreground">
                {sec.title.split("·")[0].trim()}
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {sec.questions.map((q, qi) => {
                  const a = session!.answers[q.id];
                  const filled = (a?.text?.trim().length ?? 0) > 0;
                  const current =
                    si === session!.cursor.sectionIndex &&
                    qi === session!.cursor.questionIndex;
                  return (
                    <button
                      key={q.id}
                      onClick={() => goTo(si, qi)}
                      className={cn(
                        "h-7 w-7 rounded-md border text-[10px] font-medium",
                        current
                          ? "border-foreground bg-foreground text-background"
                          : filled
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                            : "border-border/60 text-muted-foreground",
                        a?.flagged && "ring-1 ring-amber-400",
                      )}
                    >
                      {qi + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function ResultView() {
    const r = result;
    if (!r) {
      return (
        <div className="flex min-h-[100dvh] items-center justify-center text-sm text-muted-foreground">
          Generating analysis…
        </div>
      );
    }
    return (
      <div className="min-h-[100dvh] bg-background">
        <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
          <header>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Board simulation result
            </div>
            <h1 className="mt-1 font-display text-2xl font-bold">
              Predicted {r.predictedMarks}/{r.outOf} ·{" "}
              {Math.round(r.predictedPct * 100)}%
            </h1>
            <p className="text-sm text-muted-foreground">
              Marks at risk: {r.marksAtRisk} · Confidence trend: {r.confidenceTrend}
            </p>
          </header>

          <section className="rounded-3xl border border-border/60 bg-card p-5">
            <h2 className="text-sm font-semibold">Section scores</h2>
            <div className="mt-3 space-y-2">
              {r.perSection.map((p) => {
                const sec = session!.sections.find((s) => s.id === p.sectionId);
                const pct = p.outOf > 0 ? (p.scored / p.outOf) * 100 : 0;
                return (
                  <div key={p.sectionId}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {sec?.title ?? p.sectionId}
                      </span>
                      <span className="font-mono tabular-nums">
                        {p.scored}/{p.outOf}
                      </span>
                    </div>
                    <Progress value={pct} className="mt-1 h-1.5" />
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-border/60 bg-card p-5">
            <h2 className="text-sm font-semibold">Presentation</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <Metric label="Structure" value={r.presentation.structureScore} />
              <Metric label="Keywords" value={r.presentation.keywordCoverage} />
              <Metric label="Diagram labels" value={r.presentation.diagramLabeling} />
              <Metric label="Long-answer org." value={r.presentation.longAnswerOrganization} />
            </div>
          </section>

          <section className="rounded-3xl border border-border/60 bg-card p-5">
            <h2 className="text-sm font-semibold">Timing</h2>
            <div className="mt-2 text-xs text-muted-foreground">
              Balance score:{" "}
              <span className="font-mono">
                {Math.round(r.timingSummary.balanceScore * 100)}%
              </span>{" "}
              · Overspent {Math.round(r.timingSummary.overspendSec / 60)} min ·
              Unused {Math.round(r.timingSummary.underspendSec / 60)} min
            </div>
          </section>

          {r.weakAreas.length > 0 && (
            <section className="rounded-3xl border border-border/60 bg-card p-5">
              <h2 className="text-sm font-semibold">Weak areas</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {r.weakAreas.map((w) => (
                  <li key={w.label} className="flex items-center justify-between">
                    <span>{w.label}</span>
                    <span className="text-xs text-muted-foreground">
                      -{w.gap}% gap
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {r.invigilatorHighlights.length > 0 && (
            <section className="rounded-3xl border border-border/60 bg-card p-5">
              <h2 className="text-sm font-semibold">Session notes</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {r.invigilatorHighlights.map((k) => (
                  <Badge key={k} variant="outline" className="rounded-full text-[10px]">
                    {k.replace("_", " ")}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          <div className="flex gap-2">
            <Link to="/exam-hall" className="flex-1">
              <Button variant="outline" className="w-full rounded-full">
                Back to hall
              </Button>
            </Link>
            <Link to="/analytics" className="flex-1">
              <Button className="w-full rounded-full">Open analytics</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }
}

function Metric({ label, value }: { label: string; value: number }) {
  const pct = Math.round((value ?? 0) * 100);
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-lg tabular-nums">{pct}%</div>
      <Progress value={pct} className="mt-1 h-1" />
    </div>
  );
}

function InvigilatorBanner({ event }: { event: InvigilatorEventDoc }) {
  const tone =
    event.severity === "critical"
      ? "border-destructive/40 bg-destructive/10 text-destructive"
      : event.severity === "warning"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
        : "border-border/60 bg-card text-muted-foreground";
  return (
    <div className={cn("border-b px-4 py-2 text-xs", tone)}>
      <div className="mx-auto flex max-w-3xl items-center gap-2">
        <AlertTriangle className="h-3.5 w-3.5" />
        <span className="truncate">{event.message}</span>
      </div>
    </div>
  );
}

function SubmitDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-sm rounded-t-3xl border border-border/60 bg-card p-5 sm:rounded-3xl">
        <h3 className="font-display text-lg font-semibold">Submit exam?</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Once submitted you'll see your predicted marks, weak areas and a calm
          breakdown of your timing and stress.
        </p>
        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            className="flex-1 rounded-full"
            onClick={onCancel}
          >
            Keep writing
          </Button>
          <Button className="flex-1 rounded-full" onClick={() => void onConfirm()}>
            Submit now
          </Button>
        </div>
      </div>
    </div>
  );
}