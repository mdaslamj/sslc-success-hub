import { CheckCircle2, Circle, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DailyTask } from "@/integrations/firebase/types";

const KIND_TONE: Record<DailyTask["kind"], string> = {
  focus: "bg-primary/10 text-primary",
  revision: "bg-accent/40 text-foreground",
  weak_drill: "bg-warning/15 text-warning-foreground",
  formula: "bg-secondary text-foreground/80",
  recovery: "bg-destructive/10 text-destructive",
  reflection: "bg-secondary text-foreground/70",
};

const KIND_LABEL: Record<DailyTask["kind"], string> = {
  focus: "Focus",
  revision: "Revise",
  weak_drill: "Drill",
  formula: "Formula",
  recovery: "Recover",
  reflection: "Reflect",
};

export function TaskRow({
  task,
  onToggle,
  onStart,
  active,
}: {
  task: DailyTask;
  onToggle: () => void;
  onStart?: () => void;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "press flex items-start gap-3 rounded-2xl bg-card p-3.5 shadow-soft transition-colors",
        active && "ring-2 ring-primary/40",
      )}
    >
      <button
        onClick={onToggle}
        aria-label={task.done ? "Mark incomplete" : "Mark complete"}
        className="mt-0.5 shrink-0"
      >
        {task.done ? (
          <CheckCircle2 className="h-5 w-5 text-success" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
              KIND_TONE[task.kind],
            )}
          >
            {KIND_LABEL[task.kind]}
          </span>
          <span className="text-[10px] text-muted-foreground">{task.durationMin} min</span>
        </div>
        <div
          className={cn(
            "mt-1 text-sm font-medium leading-snug",
            task.done ? "text-muted-foreground line-through" : "text-foreground",
          )}
        >
          {task.title}
        </div>
        {task.reason && (
          <div className="mt-1 flex items-start gap-1 text-[11px] text-muted-foreground">
            <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary/70" />
            <span>{task.reason}</span>
          </div>
        )}
      </div>
      {onStart && !task.done && task.kind !== "reflection" && (
        <button
          onClick={onStart}
          className="press shrink-0 self-center rounded-xl bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground"
        >
          Start
        </button>
      )}
      {task.kind === "reflection" && !task.done && (
        <ChevronRight className="h-4 w-4 shrink-0 self-center text-muted-foreground" />
      )}
    </div>
  );
}