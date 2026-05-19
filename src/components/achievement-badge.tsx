import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AchievementStatus } from "@/hooks/use-achievements";

/**
 * Single badge tile. Earned: full-color, subtle scale-in on first render.
 * Locked: muted with progress bar towards unlock.
 */
export function AchievementBadge({
  status,
  className,
}: {
  status: AchievementStatus;
  className?: string;
}) {
  const { def, earned, progress } = status;
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-4 transition-all",
        earned
          ? "border-brand/30 bg-gradient-to-br from-brand/10 via-card to-card shadow-card hover:-translate-y-0.5 hover:shadow-glow animate-fade-in"
          : "border-border/60 bg-card/60",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl",
            earned
              ? "bg-gradient-to-br from-brand/25 to-brand-glow/15"
              : "bg-muted/60 grayscale opacity-60",
          )}
        >
          {earned ? def.icon : <Lock className="h-5 w-5 text-muted-foreground" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate font-display text-sm font-semibold">
              {def.title}
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                earned
                  ? "bg-brand/15 text-brand"
                  : "bg-muted text-muted-foreground",
              )}
            >
              +{def.xp} XP
            </span>
          </div>
          <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {def.description}
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                earned ? "bg-gradient-to-r from-brand to-brand-glow" : "bg-foreground/30",
              )}
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}