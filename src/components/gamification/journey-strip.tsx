import { cn } from "@/lib/utils";
import { nextJourneyTier, type JourneyTierDef } from "@/lib/gamification";

type Props = {
  tier: JourneyTierDef;
  progress: number; // 0..1
  totalXp: number;
  level: number;
  className?: string;
};

/**
 * Slim board readiness journey indicator: tier badge + xp/level chip +
 * subtle progress bar to the next tier. Calm motivational tone — no spam.
 */
export function JourneyStrip({ tier, progress, totalXp, level, className }: Props) {
  const next = nextJourneyTier(tier.id);
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl border border-border/60 bg-card p-4 shadow-soft",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-2xl"
        >
          {tier.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-display text-sm font-bold text-foreground">
              {tier.label}
            </span>
            <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
              L{level}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {tier.description}
          </p>
        </div>
        <div className="text-right">
          <div className="font-display text-base font-bold leading-none text-foreground">
            {totalXp.toLocaleString()}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">XP</div>
        </div>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-brand-glow transition-all duration-700"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
      {next && (
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          Next: <span className="font-medium text-foreground">{next.label}</span> {next.emoji}
        </p>
      )}
    </section>
  );
}