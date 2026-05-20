import { Target, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MissionDoc } from "@/integrations/firebase/types";
import { missionPercent } from "@/lib/gamification";

type Props = {
  missions: MissionDoc[];
  className?: string;
};

/**
 * Calm, mobile-first daily missions strip. Subtle progress bars, no spammy
 * celebrations — completion is a quiet check, not a confetti blast.
 */
export function DailyMissionsCard({ missions, className }: Props) {
  if (!missions.length) return null;
  const done = missions.filter((m) => m.completed).length;

  return (
    <section className={cn("rounded-3xl bg-card p-5 shadow-soft", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
          <Target className="h-3.5 w-3.5 text-primary" /> Today's missions
        </div>
        <span className="text-[11px] font-medium text-muted-foreground">
          {done}/{missions.length} done
        </span>
      </div>
      <ul className="mt-3 space-y-2.5">
        {missions.map((m) => {
          const pct = missionPercent(m);
          return (
            <li
              key={m.id}
              className={cn(
                "rounded-2xl border bg-background/40 p-3 transition-colors",
                m.completed ? "border-success/40 bg-success/5" : "border-border/60",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base leading-none">{m.icon}</span>
                    <span
                      className={cn(
                        "truncate text-sm font-semibold text-foreground",
                        m.completed && "line-through opacity-70",
                      )}
                    >
                      {m.title}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                    {m.description}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  {m.completed ? (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-success/15 text-success">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  ) : (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      +{m.xpReward} XP
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    m.completed ? "bg-success" : "bg-primary",
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}