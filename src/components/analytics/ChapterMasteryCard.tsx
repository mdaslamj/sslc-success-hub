import { BookOpen, Clock, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ChapterMasterySummary } from "@/engines/analytics/sessionAnalytics";
import {
  getMasteryColor,
  type MasteryLabel,
} from "@/engines/analytics/profileUpdater";

type Props = {
  chapter: ChapterMasterySummary;
  onPractice?: () => void;
  className?: string;
};

function masteryBarColor(mastery: number): string {
  if (mastery >= 85) return "bg-green-500";
  if (mastery >= 60) return "bg-blue-500";
  if (mastery >= 30) return "bg-amber-500";
  if (mastery > 0) return "bg-red-500";
  return "bg-muted-foreground/30";
}

function formatDaysSince(days: number | null): string {
  if (days === null) return "Not practiced yet";
  if (days === 0) return "Practiced today";
  if (days === 1) return "Last practiced yesterday";
  return `Last practiced ${days} days ago`;
}

export function ChapterMasteryCard({
  chapter,
  onPractice,
  className,
}: Props) {
  const label = chapter.label as MasteryLabel;
  const labelColor = getMasteryColor(label);
  const showMastery = chapter.totalAttempts > 0;

  return (
    <article
      className={cn(
        "rounded-2xl border border-border/60 bg-card p-4 shadow-soft sm:p-5",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5 shrink-0" />
            Chapter mastery
          </div>
          <h3 className="mt-1 truncate font-display text-base font-semibold text-foreground">
            {chapter.chapterName}
          </h3>
        </div>
        <div className="shrink-0 text-right">
          {showMastery ? (
            <p className={cn("text-2xl font-bold tabular-nums", labelColor)}>
              {chapter.mastery}%
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
          <p className={cn("text-xs font-medium", labelColor)}>{label}</p>
        </div>
      </div>

      <div className="mt-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              masteryBarColor(chapter.mastery),
            )}
            style={{ width: `${showMastery ? chapter.mastery : 0}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDaysSince(chapter.daysSinceLastAttempt)}
        </span>
        <span>
          {chapter.totalAttempts} attempt
          {chapter.totalAttempts === 1 ? "" : "s"}
        </span>
        {chapter.delta !== null && chapter.delta !== 0 && (
          <span
            className={cn(
              "inline-flex items-center gap-1 font-medium",
              chapter.delta > 0
                ? "text-green-600 dark:text-green-400"
                : "text-red-500 dark:text-red-400",
            )}
          >
            {chapter.delta > 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {chapter.delta > 0 ? "+" : ""}
            {chapter.delta}% this session
          </span>
        )}
      </div>

      {onPractice && (
        <Button
          type="button"
          variant="outline"
          className="mt-4 w-full rounded-full"
          onClick={onPractice}
        >
          Practice this chapter
        </Button>
      )}
    </article>
  );
}
