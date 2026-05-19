import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Circle,
  Flame,
  RotateCcw,
  Sparkles,
  Target,
  TrendingDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { usePlanner } from "@/hooks/use-planner";

/**
 * Self-contained Smart Planner widgets. Drop into any dashboard slot; each
 * widget reads from `usePlanner()` independently so they can be used in
 * isolation without prop drilling.
 */

function CardShell({
  title,
  icon,
  right,
  children,
  className = "",
}: {
  title: string;
  icon: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-3xl border border-border/60 bg-card p-5 shadow-card ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold flex items-center gap-2">
          <span className="text-brand">{icon}</span>
          {title}
        </h3>
        {right}
      </div>
      {children}
    </div>
  );
}

/** Today's planner tasks — surfaces priority list + completion bar. */
export function PlannerTodayWidget({ limit = 4 }: { limit?: number }) {
  const p = usePlanner();
  const visible = p.tasks.slice(0, limit);

  return (
    <CardShell
      title="Today's Plan"
      icon={<CalendarClock className="h-4 w-4" />}
      right={
        <Badge variant="outline" className="rounded-full gap-1 text-[10px]">
          {p.tasks.filter((t) => t.status === "done").length}/{p.tasks.length}
        </Badge>
      }
    >
      {p.tasks.length === 0 ? (
        <EmptyState text={p.loading ? "Building your plan…" : "No tasks scheduled."} />
      ) : (
        <>
          <Progress value={p.completionPercent} className="h-1.5" />
          <p className="mt-2 text-[11px] text-muted-foreground">
            {p.doneMinutes} / {p.targetMinutes} min · {p.completionPercent}%
          </p>
          <ul className="mt-3 space-y-1.5">
            {visible.map((t) => (
              <li
                key={t.id}
                className="group flex items-start gap-2.5 rounded-xl border border-border/50 bg-background/40 p-2.5 transition hover:border-brand/40"
              >
                <button
                  type="button"
                  className="mt-0.5 shrink-0 text-muted-foreground transition hover:text-success"
                  onClick={() =>
                    p.setTaskStatus(t.id, t.status === "done" ? "pending" : "done")
                  }
                  aria-label={t.status === "done" ? "Mark pending" : "Mark done"}
                >
                  {t.status === "done" ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div
                    className={`truncate text-xs font-medium ${
                      t.status === "done" ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {t.title}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {t.kind} · {t.durationMinutes} min
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <Link
            to="/planner"
            className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-brand hover:underline"
          >
            Open planner <ArrowRight className="h-3 w-3" />
          </Link>
        </>
      )}
    </CardShell>
  );
}

/** Spaced-repetition cards that are due today or overdue. */
export function RevisionDueWidget({ limit = 4 }: { limit?: number }) {
  const p = usePlanner();
  const due = [...p.revisions.overdue, ...p.revisions.today].slice(0, limit);

  return (
    <CardShell
      title="Revision Due"
      icon={<RotateCcw className="h-4 w-4" />}
      right={
        <Badge variant="outline" className="rounded-full text-[10px]">
          {p.revisions.overdue.length + p.revisions.today.length}
        </Badge>
      }
    >
      {due.length === 0 ? (
        <EmptyState text="All caught up. New cards seed on chapter completion." />
      ) : (
        <ul className="space-y-1.5">
          {due.map((c) => {
            const overdueDays = Math.max(
              0,
              Math.round((Date.now() - c.dueAt) / 86_400_000),
            );
            return (
              <li
                key={c.id}
                className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/40 p-2.5"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning">
                  <Flame className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium">
                    {c.chapterTitle ?? c.chapterId}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {overdueDays > 0 ? `${overdueDays}d overdue` : "Due today"}
                    {c.lapses > 0 ? ` · ${c.lapses} lapse${c.lapses > 1 ? "s" : ""}` : ""}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px]"
                    onClick={() => p.reviewRevision(c.id, 2)}
                  >
                    Hard
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px] text-success"
                    onClick={() => p.reviewRevision(c.id, 5)}
                  >
                    Easy
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </CardShell>
  );
}

/** Weak subjects — based on subject weak-topic flags + quiz accuracy. */
export function WeakSubjectsWidget({ limit = 4 }: { limit?: number }) {
  const p = usePlanner();
  const list = p.weakSubjects.slice(0, limit);

  return (
    <CardShell
      title="Weak Subjects"
      icon={<TrendingDown className="h-4 w-4" />}
      right={
        <Badge variant="outline" className="rounded-full text-[10px]">
          {p.weakSubjects.length}
        </Badge>
      }
    >
      {list.length === 0 ? (
        <EmptyState text="No weak topics flagged. Keep going." />
      ) : (
        <ul className="space-y-1.5">
          {list.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-background/40 p-2.5"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
                style={{
                  background: `color-mix(in oklab, ${s.color} 18%, transparent)`,
                  color: s.color,
                }}
              >
                {s.emoji ?? "•"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold">{s.name}</div>
                <div className="truncate text-[10px] text-muted-foreground">
                  {s.weakTopics.slice(0, 2).join(" · ")}
                </div>
              </div>
              <span className="text-[10px] tabular-nums text-muted-foreground">
                {s.completion}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </CardShell>
  );
}

/** Recommended next chapter — the weakest subject's next incomplete chapter. */
export function NextChapterWidget() {
  const p = usePlanner();
  const rec = p.recommendedNextChapter;
  return (
    <CardShell title="Next Chapter" icon={<Sparkles className="h-4 w-4" />}>
      {!rec ? (
        <EmptyState text="Syllabus complete. Time for mock tests." />
      ) : (
        <div className="flex items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg font-bold"
            style={{
              background: `color-mix(in oklab, ${rec.subject.color} 18%, transparent)`,
              color: rec.subject.color,
            }}
          >
            {rec.subject.emoji ?? "📘"}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {rec.subject.name}
            </div>
            <div className="truncate text-sm font-semibold">{rec.chapter.title}</div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">
              ~{rec.chapter.estimatedMinutes ?? 30} min · {rec.subject.completion}% subject done
            </div>
            <Link
              to="/subjects/$subjectId"
              params={{ subjectId: rec.subject.id }}
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-brand hover:underline"
            >
              Start <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </CardShell>
  );
}

/** Exam countdown — surfaces only when an exam is configured. */
export function ExamCountdownWidget() {
  const p = usePlanner();
  if (p.examCountdownDays === null || p.examCountdownDays === undefined) return null;
  const d = p.examCountdownDays;
  return (
    <CardShell title="Next Exam" icon={<Target className="h-4 w-4" />}>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-3xl font-bold tabular-nums">{d}</span>
        <span className="text-xs text-muted-foreground">days to go</span>
      </div>
      {d <= 7 && (
        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] text-warning">
          <AlertCircle className="h-3 w-3" /> High-pressure week
        </div>
      )}
    </CardShell>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border/60 p-4 text-center text-[11px] text-muted-foreground">
      {text}
    </div>
  );
}

/** Convenience: render the four core widgets in a responsive grid. */
export function PlannerWidgetGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <PlannerTodayWidget />
      <RevisionDueWidget />
      <WeakSubjectsWidget />
      <NextChapterWidget />
    </div>
  );
}