import { AlertTriangle, Sparkles, TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SessionInsight } from "@/engines/analytics/sessionAnalytics";

type Props = {
  insights: SessionInsight;
  questionsAnswered: number;
  chapterLabels?: Record<string, string>;
  onDismiss?: () => void;
  onContinue?: () => void;
  className?: string;
};

function formatChapter(
  chapterId: string,
  labels?: Record<string, string>,
): string {
  return labels?.[chapterId] ?? chapterId.replace(/[-_]/g, " ");
}

export function MidSessionCheckIn({
  insights,
  questionsAnswered,
  chapterLabels,
  onDismiss,
  onContinue,
  className,
}: Props) {
  const hasInsights =
    insights.improving.length > 0 || insights.needsWork.length > 0;

  if (!hasInsights) return null;

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-card p-4 shadow-soft sm:p-5",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-brand" />
            Mid-session check-in
          </div>
          <h3 className="mt-1 font-display text-base font-semibold text-foreground">
            After {questionsAnswered} questions
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Aura noticed patterns in this session. Keep going — adjust focus if
            needed.
          </p>
        </div>
        {onDismiss && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-full"
            onClick={onDismiss}
            aria-label="Dismiss check-in"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {insights.improving.length > 0 && (
          <section className="rounded-xl border border-green-200/70 bg-green-50/60 p-3 dark:border-green-900/50 dark:bg-green-950/20">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-green-800 dark:text-green-300">
              <TrendingUp className="h-4 w-4 shrink-0" />
              Improving
            </div>
            <ul className="space-y-1.5">
              {insights.improving.map((chapterId) => (
                <li
                  key={`up-${chapterId}`}
                  className="text-sm text-green-900/90 dark:text-green-200/90"
                >
                  {formatChapter(chapterId, chapterLabels)}
                </li>
              ))}
            </ul>
          </section>
        )}

        {insights.needsWork.length > 0 && (
          <section className="rounded-xl border border-amber-200/70 bg-amber-50/60 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Needs attention
            </div>
            <ul className="space-y-1.5">
              {insights.needsWork.map((chapterId) => (
                <li
                  key={`work-${chapterId}`}
                  className="text-sm text-amber-900/90 dark:text-amber-200/90"
                >
                  {formatChapter(chapterId, chapterLabels)}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {onContinue && (
        <Button
          type="button"
          className="mt-4 w-full rounded-full"
          onClick={onContinue}
        >
          Continue session
        </Button>
      )}
    </div>
  );
}
