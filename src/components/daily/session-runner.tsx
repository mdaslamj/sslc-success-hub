import { Pause, Play, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DailyTask } from "@/integrations/firebase/types";

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function SessionRunner({
  task,
  seconds,
  onComplete,
  onCancel,
}: {
  task: DailyTask;
  seconds: number;
  onComplete: () => void;
  onCancel: () => void;
}) {
  const targetSec = task.durationMin * 60;
  const pct = Math.min(100, Math.round((seconds / targetSec) * 100));
  return (
    <div
      className="fixed inset-x-0 bottom-16 z-50 mx-auto max-w-md px-3 md:bottom-4"
      role="dialog"
      aria-label="Active study session"
    >
      <div className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-soft">
        <div className="h-1 w-full bg-secondary">
          <div
            className="h-full bg-primary transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center gap-3 p-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Play className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-foreground">{task.title}</div>
            <div className="text-[11px] text-muted-foreground">
              {task.subject ? `${task.subject} · ` : ""}target {task.durationMin}m
            </div>
          </div>
          <div className="font-display text-lg font-bold tabular-nums text-foreground">
            {fmt(seconds)}
          </div>
        </div>
        <div className="flex gap-2 border-t border-border/60 bg-secondary/40 p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="flex-1 rounded-xl"
          >
            <X className="mr-1 h-4 w-4" /> Pause
          </Button>
          <Button
            size="sm"
            onClick={onComplete}
            className="flex-1 rounded-xl"
          >
            <CheckCircle2 className="mr-1 h-4 w-4" /> Done
          </Button>
        </div>
      </div>
    </div>
  );
}