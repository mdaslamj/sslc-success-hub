/**
 * Adaptive Guidance Card — calm daily study guidance derived from
 * `adaptivePlannerBridge`. Mobile-first, lightweight, no animations.
 *
 * It surfaces:
 *   - Daily Focus      (1 calm pick)
 *   - Suggested Revision
 *   - Recovery Chapters
 *   - Balanced Practice
 *
 * Items can be added to today's plan via the `onAdd` callback so the
 * planner stays the single source of truth for the day's schedule.
 */

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, Plus, Sparkles, LifeBuoy, Target, Heart } from "lucide-react";
import {
  buildAdaptiveDailyPlan,
  type AdaptivePlanItem,
} from "@/lib/adaptivePlannerBridge";
import { getEmotionalSummary } from "@/lib/emotionalProgress";

export type AdaptiveGuidanceCardProps = {
  subjectId?: string;
  /** Add an adaptive suggestion to today's plan. */
  onAdd: (item: AdaptivePlanItem) => void;
};

const KIND_META: Record<
  AdaptivePlanItem["kind"],
  { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  "daily-focus": { label: "Daily focus", icon: Target, tone: "bg-brand/10 text-brand border-brand/30" },
  revision: { label: "Revision", icon: Sparkles, tone: "bg-warning/10 text-warning border-warning/30" },
  recovery: { label: "Recovery", icon: LifeBuoy, tone: "bg-info/10 text-info border-info/30" },
  practice: { label: "Practice", icon: Brain, tone: "bg-success/10 text-success border-success/30" },
};

export function AdaptiveGuidanceCard({ subjectId, onAdd }: AdaptiveGuidanceCardProps) {
  // Build once per render; pure & deterministic for the current snapshot.
  const plan = useMemo(() => buildAdaptiveDailyPlan({ subjectId }), [subjectId]);

  const items: AdaptivePlanItem[] = [
    ...(plan.dailyFocus ? [plan.dailyFocus] : []),
    ...plan.revision,
    ...plan.recovery,
    ...plan.practice,
  ];

  return (
    <div className="rounded-3xl border border-border/60 bg-card p-5 sm:p-6 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-base sm:text-lg font-semibold flex items-center gap-2 min-w-0">
          <Brain className="h-4 w-4 text-brand shrink-0" />
          <span className="truncate">Today’s Adaptive Guidance</span>
        </h3>
        {!plan.empty && (
          <Badge variant="outline" className="rounded-full text-[10px]">
            ~{plan.totalMinutes} min
          </Badge>
        )}
      </div>

      <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-snug">
        {plan.message}
      </p>

      {plan.empty ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border/60 p-4 text-xs text-muted-foreground">
          Attempt a quick chapter test or mock exam to unlock calm, personalised guidance here.
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((item) => {
            const meta = KIND_META[item.kind];
            const Icon = meta.icon;
            return (
              <li
                key={item.id}
                className="rounded-2xl border border-border/60 bg-background/40 p-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${meta.tone}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        {meta.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">·</span>
                      <span className="text-[10px] text-muted-foreground">
                        {item.minutes} min
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-sm font-medium">
                      {item.title}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground leading-snug">
                      {item.message}
                    </div>
                    {item.reasons.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {item.reasons.map((r) => (
                          <span
                            key={r}
                            className="rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 shrink-0 rounded-full px-2.5 text-[11px]"
                    onClick={() => onAdd(item)}
                    aria-label={`Add ${item.title} to today's plan`}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
