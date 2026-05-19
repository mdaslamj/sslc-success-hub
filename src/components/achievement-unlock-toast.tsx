import { useEffect } from "react";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { findAchievement } from "@/lib/achievements-catalog";
import type { UserAchievementDoc } from "@/integrations/firebase/types";

/**
 * Lightweight, dependency-free unlock toast. Reuses the existing
 * `animate-scale-in` / `animate-fade-in` utilities from tw-animate-css so
 * the engine works on every page without pulling in a motion library.
 *
 * Stacks up to 3 simultaneous unlocks; older ones auto-dismiss after 6s.
 */
export function AchievementUnlockStack({
  unlocks,
  onDismiss,
}: {
  unlocks: UserAchievementDoc[];
  onDismiss: (code: string) => void;
}) {
  useEffect(() => {
    if (!unlocks.length) return;
    const timers = unlocks.map((u) =>
      setTimeout(() => onDismiss(u.code), 6000),
    );
    return () => timers.forEach(clearTimeout);
  }, [unlocks, onDismiss]);

  if (!unlocks.length) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-3">
      {unlocks.slice(-3).map((u) => {
        const def = findAchievement(u.code);
        if (!def) return null;
        return (
          <div
            key={u.id}
            className="pointer-events-auto relative overflow-hidden rounded-2xl border border-brand/40 bg-card/95 p-4 shadow-glow backdrop-blur-xl animate-scale-in"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-brand/40 to-brand-glow/20 blur-2xl" />
            <div className="relative flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand/25 to-brand-glow/15 text-2xl">
                {def.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-brand">
                  <Sparkles className="h-3 w-3" />
                  Achievement Unlocked
                </div>
                <div className="mt-0.5 font-display text-sm font-bold">
                  {def.title}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  +{def.xp} XP · {def.description}
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="-mr-1 -mt-1 h-7 w-7 rounded-full"
                onClick={() => onDismiss(u.code)}
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}