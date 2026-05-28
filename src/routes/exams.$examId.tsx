import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  Clock,
  Flag,
  ListChecks,
  Send,
  X,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useMockExam } from "@/hooks/use-mock-exam";
import { readCachedExam } from "@/lib/mock-exam-store";
import { SEED_MOCK_EXAMS } from "@/lib/mock-exam-seed";
import { fetchMockExam } from "@/integrations/firebase/services/mock-exams";
import type { MockExamDoc } from "@/integrations/firebase/types";
import { UploadAnswerButton } from "@/components/answer-upload/upload-answer-button";
import { useContentCatalog } from "@/hooks/use-content-catalog";
import { rebuildContentExamById } from "@/lib/content-exam-builder";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/exams/$examId")({
  head: ({ params }) => ({
    meta: [
      { title: "Aura — Mock Exam" },
      {
        name: "description",
        content: `Timed mock exam ${params.examId} with auto-grading and weak-area analytics.`,
      },
 
    ],
  }),
  component: ExamPlayerPage,
});

function ExamPlayerPage() {
  const { examId } = Route.useParams();
  const [exam, setExam] = useState<MockExamDoc | null>(null);
  const [missing, setMissing] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const content = useContentCatalog();

  useEffect(() => {
    setMissing(false);
    setExam(null);
  }, [examId]);

  useEffect(() => {
    const cached = readCachedExam(examId);
    if (cached) {
      console.debug("[exam] cache-hit", { examId });
      setMissing(false);
      setExam(cached);
      return;
    }
    // Try to rebuild from content (subject mock, chapter test, mixed).
    const built = rebuildContentExamById(examId, {
      subjects: content.subjects.map((s) => ({
        runtimeId: s.runtimeId,
        name: s.name,
        chapters: s.chapters,
      })),
    });
    if (built) {
      console.debug("[exam] rebuild-hit", { examId });
      setMissing(false);
      setExam(built);
      return;
    }
    const seed = SEED_MOCK_EXAMS.find((e) => e.id === examId);
    if (seed) {
      console.debug("[exam] seed-hit", { examId });
      setMissing(false);
      setExam(seed);
      return;
    }
    // Wait until the content catalogue has finished loading before
    // giving up — chapter / subject mock ids are built from that data.
    if (content.isLoading) {
      console.debug("[exam] waiting-catalog", { examId });
      return;
    }

    let cancelled = false;
    fetchMockExam(examId)
      .then((e) => {
        if (cancelled) return;
        if (e) {
          console.debug("[exam] remote-hit", { examId });
          setMissing(false);
          setExam(e);
        } else {
          console.debug("[exam] missing", { examId });
          setMissing(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          console.debug("[exam] missing", { examId });
          setMissing(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [examId, content.subjects, content.isLoading, retryToken]);

  if (missing) {
    return (
      <DashboardLayout title="Mock Exam">
        <div className="mx-auto max-w-md rounded-3xl border border-border/60 bg-card p-8 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
          <p className="mt-3 text-sm">Unable to load exam. Retry.</p>
          <div className="mt-4 flex justify-center gap-2">
            <Button
              className="rounded-full"
              onClick={() => setRetryToken((t) => t + 1)}
            >
              Retry
            </Button>
            <Link to="/exams">
              <Button variant="outline" className="rounded-full">
                Back to exams
              </Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!exam) {
    return (
      <DashboardLayout title="Mock Exam">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="rounded-3xl border border-border/60 bg-card p-5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-3 h-6 w-3/4" />
            <Skeleton className="mt-2 h-1.5 w-full" />
          </div>
          <div className="rounded-3xl border border-border/60 bg-card p-6 space-y-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-2xl" />
          </div>
          <p className="text-center text-xs text-muted-foreground">
            {content.isLoading ? "Restoring exam…" : "Loading exam…"}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return <Player exam={exam} />;
}

function Player({ exam }: { exam: MockExamDoc }) {
  const navigate = useNavigate();
  const c = useMockExam(exam);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  const total = exam.questions.length;
  const answered = c.answers.filter((a) => a?.selectedIndex != null).length;
  const marked = c.answers.filter((a) => a?.marked).length;

  const q = exam.questions[c.cursor];
  const a = c.answers[c.cursor];

  // Navigate to results once submitted.
  useEffect(() => {
    if (c.phase === "submitted" && c.result) {
      navigate({
        to: "/exam-results/$attemptId",
        params: { attemptId: c.result.id },
      });
    }
  }, [c.phase, c.result, navigate]);

  const timerLow = c.secondsLeft <= 60;

  return (
    <DashboardLayout title={exam.title}>
      <div className="mx-auto max-w-6xl">
        {/* Sticky exam header */}
        <div className="sticky top-14 z-10 -mx-4 sm:-mx-5 md:-mx-6 lg:-mx-8 mb-4 border-b border-border/60 bg-background/85 px-4 sm:px-5 md:px-6 lg:px-8 py-3 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Question {c.cursor + 1} / {total}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {answered} answered · {marked} marked
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1.5 text-sm font-semibold tabular-nums",
                  timerLow && "border-destructive/60 text-destructive animate-pulse",
                )}
              >
                <Clock className="h-3.5 w-3.5" />
                {formatTime(c.secondsLeft)}
              </div>
              <Sheet>
                <SheetTrigger asChild>
                  <Button size="sm" variant="outline" className="rounded-full gap-1 md:hidden">
                    <ListChecks className="h-3.5 w-3.5" /> Nav
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72">
                  <SheetHeader>
                    <SheetTitle>Question navigator</SheetTitle>
                  </SheetHeader>
                  <Navigator
                    exam={exam}
                    cursor={c.cursor}
                    answers={c.answers}
                    onPick={c.setCursor}
                  />
                </SheetContent>
              </Sheet>
              <Button
                size="sm"
                className="rounded-full gap-1"
                onClick={() => setConfirmSubmit(true)}
              >
                <Send className="h-3.5 w-3.5" /> Submit
              </Button>
            </div>
          </div>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-border/40">
            <div
              className="h-full bg-foreground transition-all"
              style={{ width: `${(answered / total) * 100}%` }}
            />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
          {/* Question card */}
          <section className="rounded-3xl border border-border/60 bg-card p-5 md:p-6 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-lg md:text-xl font-semibold leading-snug">
                {q.question}
              </h2>
              <button
                onClick={() => c.toggleMark(c.cursor)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-medium",
                  a?.marked
                    ? "border-warning bg-warning/10 text-warning"
                    : "border-border/60 text-muted-foreground hover:text-foreground",
                )}
              >
                <Bookmark
                  className={cn("mr-1 inline h-3 w-3", a?.marked && "fill-warning")}
                />
                {a?.marked ? "Marked" : "Mark for review"}
              </button>
            </div>
            {(q.topic || q.difficulty) && (
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                {q.topic && (
                  <span className="rounded-full bg-muted px-2 py-0.5">{q.topic}</span>
                )}
                {q.difficulty && (
                  <span className="rounded-full bg-muted px-2 py-0.5">{q.difficulty}</span>
                )}
                <span className="rounded-full bg-muted px-2 py-0.5">{q.marks} mark</span>
              </div>
            )}

            <div className="mt-5 grid gap-2">
              {q.options.map((opt, i) => {
                const selected = a?.selectedIndex === i;
                return (
                  <button
                    key={i}
                    onClick={() => c.select(c.cursor, i)}
                    className={cn(
                      "rounded-2xl border px-4 py-3 text-left text-sm transition-colors min-h-12",
                      selected
                        ? "border-foreground bg-foreground/5"
                        : "border-border/60 hover:border-foreground/40",
                    )}
                  >
                    <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>

            {a?.selectedIndex != null && (
              <button
                onClick={() => c.clear(c.cursor)}
                className="mt-3 text-xs text-muted-foreground hover:text-destructive"
              >
                Clear response
              </button>
            )}

            <div className="mt-6 flex items-center justify-between gap-2">
              <Button
                variant="outline"
                onClick={c.prev}
                disabled={c.cursor === 0}
                className="rounded-full"
              >
                <ArrowLeft className="mr-1 h-4 w-4" /> Prev
              </Button>
              {c.cursor < total - 1 ? (
                <Button onClick={c.next} className="rounded-full">
                  Next <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={() => setConfirmSubmit(true)} className="rounded-full">
                  Submit <Check className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </section>

          {/* Side navigator (desktop) */}
          <aside className="hidden lg:block">
            <div className="sticky top-32 rounded-3xl border border-border/60 bg-card p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold">
                <ListChecks className="h-3.5 w-3.5" /> Navigator
              </div>
              <Navigator
                exam={exam}
                cursor={c.cursor}
                answers={c.answers}
                onPick={c.setCursor}
              />
              <Legend />
            </div>
          </aside>
        </div>

        <div className="mt-4 text-center">
          <Link to="/exams" className="text-xs text-muted-foreground hover:text-foreground">
            Exit exam (progress saved)
          </Link>
        </div>

        <div className="mt-3 flex justify-center">
          <UploadAnswerButton
            context={{
              type: "mock",
              refId: exam.id,
              subjectId: exam.subjectId,
              label: exam.title,
            }}
            label="Upload handwritten answer sheet"
          />
        </div>
      </div>

      <Dialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit exam?</DialogTitle>
            <DialogDescription>
              You've answered {answered} of {total} questions
              {marked > 0 && <> · {marked} marked for review</>}. This will lock
              your answers and grade the paper.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmSubmit(false)}>
              Keep going
            </Button>
            <Button
              onClick={() => {
                setConfirmSubmit(false);
                c.submit("manual");
              }}
            >
              <Send className="mr-1 h-3.5 w-3.5" /> Submit now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function Navigator({
  exam,
  cursor,
  answers,
  onPick,
}: {
  exam: MockExamDoc;
  cursor: number;
  answers: ReturnType<typeof useMockExam>["answers"];
  onPick: (i: number) => void;
}) {
  return (
    <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 lg:grid-cols-5">
      {exam.questions.map((_, i) => {
        const a = answers[i];
        const isCurrent = i === cursor;
        const isAnswered = a?.selectedIndex != null;
        const isMarked = a?.marked;
        return (
          <button
            key={i}
            onClick={() => onPick(i)}
            className={cn(
              "relative h-9 w-9 rounded-md border text-xs font-semibold tabular-nums transition-colors",
              isCurrent
                ? "border-foreground bg-foreground text-background"
                : isAnswered
                  ? "border-success/40 bg-success/15 text-success"
                  : "border-border/60 bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {i + 1}
            {isMarked && (
              <Flag className="absolute -right-1 -top-1 h-3 w-3 text-warning fill-warning" />
            )}
          </button>
        );
      })}
    </div>
  );
}

function Legend() {
  return (
    <div className="mt-4 space-y-1.5 text-[11px] text-muted-foreground">
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded border border-success/40 bg-success/15" />
        Answered
      </div>
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded border border-border/60 bg-card" />
        Not answered
      </div>
      <div className="flex items-center gap-2">
        <Flag className="h-3 w-3 text-warning fill-warning" />
        Marked for review
      </div>
    </div>
  );
}

function formatTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = m.toString().padStart(2, "0");
  const ss = sec.toString().padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// Eslint hint
void X;