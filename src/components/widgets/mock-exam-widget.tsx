import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowRight, FlaskConical, Play, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SEED_MOCK_EXAMS } from "@/lib/mock-exam-seed";
import { listLocalResults } from "@/lib/mock-exam-store";

/**
 * Dashboard widget for the mock exam system. Surfaces: last score, trend,
 * and an AI-recommended next exam (based on weak areas + history).
 */
export function MockExamWidget() {
  const recent = useMemo(() => listLocalResults().slice(0, 5), []);
  const last = recent[0];
  const prev = recent[1];
  const delta = last && prev ? last.percentage - prev.percentage : null;

  // Recommend the next untaken exam, prioritising ones touching weak areas.
  const recommended = useMemo(() => {
    const takenExamIds = new Set(recent.map((r) => r.examId));
    const weakAreas = new Set(recent.flatMap((r) => r.weakAreas));
    const untaken = SEED_MOCK_EXAMS.filter((e) => !takenExamIds.has(e.id));
    if (weakAreas.size > 0) {
      const weakMatch = untaken.find((e) =>
        e.questions.some((q) => q.topic && weakAreas.has(q.topic)),
      );
      if (weakMatch) return weakMatch;
    }
    return untaken[0] ?? SEED_MOCK_EXAMS[0];
  }, [recent]);

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground">
            <FlaskConical className="h-3.5 w-3.5" />
            Mock exams
          </div>
          <h3 className="mt-1 font-display text-lg font-semibold">
            {last ? "Your latest result" : "Take your first mock"}
          </h3>
        </div>
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link to="/exams">
            All <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      {last ? (
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <div className="font-display text-4xl font-bold tabular-nums">
              {last.percentage}%
            </div>
            <div className="text-xs text-muted-foreground">
              {last.marksScored}/{last.totalMarks} marks · predicted{" "}
              {last.predictedBoardScore}%
            </div>
          </div>
          {delta !== null && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                delta >= 0
                  ? "bg-success/15 text-success"
                  : "bg-destructive/15 text-destructive",
              )}
            >
              <TrendingUp className={cn("h-3 w-3", delta < 0 && "rotate-180")} />
              {delta >= 0 ? "+" : ""}
              {delta} pts
            </span>
          )}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Practice under exam conditions to predict your board score.
        </p>
      )}

      <div className="mt-5 rounded-xl bg-secondary/60 p-3">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 h-4 w-4 text-info shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Recommended next
            </p>
            <p className="truncate text-sm font-medium">{recommended.title}</p>
            <p className="text-[11px] text-muted-foreground">
              {Math.round(recommended.durationSeconds / 60)} min ·{" "}
              {recommended.questions.length} questions
            </p>
          </div>
        </div>
        <Button
          asChild
          size="sm"
          className="mt-3 w-full rounded-full gap-1.5"
        >
          <Link to="/exams/$examId" params={{ examId: recommended.id }}>
            <Play className="h-3 w-3" /> Start now
          </Link>
        </Button>
      </div>
    </div>
  );
}