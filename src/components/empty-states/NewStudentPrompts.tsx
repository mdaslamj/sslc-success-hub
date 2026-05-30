import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PromptProps = {
  className?: string;
};

export function DashboardFirstSessionPrompt({ className }: PromptProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[#8B5CF6]/35 bg-[#8B5CF6]/10 px-4 py-5 text-center",
        className,
      )}
    >
      <p className="text-sm text-slate-200">
        Complete your first study session to see your readiness score
      </p>
      <Button asChild className="mt-4 rounded-xl bg-[#8B5CF6] text-white hover:bg-[#7C3AED]">
        <Link to="/planner">Start first session</Link>
      </Button>
    </div>
  );
}

export function PlannerOnboardingPrompt({ className }: PromptProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-border/60 bg-card p-10 text-center",
        className,
      )}
    >
      <p className="text-sm text-muted-foreground">
        Complete onboarding to get your personalised study plan
      </p>
      <Button asChild className="mt-4 rounded-xl">
        <Link to="/onboarding">Set up my plan</Link>
      </Button>
    </div>
  );
}

export function AnalyticsInsufficientDataPrompt({ className }: PromptProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-2xl border border-border/60 bg-muted/30 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Study for at least 3 sessions to see your progress charts
        </p>
      </div>
      <div className="grid gap-3 opacity-40 sm:grid-cols-2">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className="h-32 rounded-xl border border-dashed border-border/60 bg-muted/20"
            aria-hidden
          />
        ))}
      </div>
    </div>
  );
}

export function ConstellationEmptyMessage({ className }: PromptProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-[#08080E]/75 px-6 text-center",
        className,
      )}
    >
      <p className="max-w-sm text-sm text-[rgba(240,240,248,0.75)]">
        Your constellation grows as you master chapters. Start studying to see it light up.
      </p>
    </div>
  );
}

export function ExamReadinessSetTargetsPrompt({ className }: PromptProps) {
  return (
    <div
      className={cn(
        "flex min-h-[480px] flex-col items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#08080E] px-6 text-center",
        className,
      )}
    >
      <p className="max-w-md text-sm text-[rgba(240,240,248,0.75)]">
        Set your targets to see your exam predictions
      </p>
      <Button
        asChild
        className="mt-6 rounded-xl bg-[#8B5CF6] text-white hover:bg-[#7C3AED]"
      >
        <Link to="/targets">Set targets</Link>
      </Button>
    </div>
  );
}
