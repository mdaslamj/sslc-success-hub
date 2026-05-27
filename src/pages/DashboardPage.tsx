import { useMemo } from "react";
import { AuraDashboard } from "@/components/dashboard/AuraDashboard";
import { AuraErrorBoundary } from "@/components/shared/AuraErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdaptiveTheme } from "@/hooks/useAdaptiveTheme";
import { useAuraEngines } from "@/hooks/useAuraEngines";

function AuraDashboardSkeleton() {
  return (
    <div
      className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden bg-[#020817] text-slate-200"
      style={{ fontFamily: "DM Sans, sans-serif" }}
    >
      <Skeleton className="mx-4 mt-3 h-[50px] shrink-0 rounded-lg bg-[#1a2744]" />
      <Skeleton className="mx-4 mt-3 h-40 shrink-0 rounded-xl bg-[#1a2744]" />
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 px-4 py-3 md:grid-cols-3">
        <Skeleton className="min-h-32 rounded-xl bg-[#1a2744]" />
        <Skeleton className="min-h-32 rounded-xl bg-[#1a2744]" />
        <Skeleton className="min-h-32 rounded-xl bg-[#1a2744]" />
      </div>
      <Skeleton className="mx-4 mb-3 h-28 shrink-0 rounded-xl bg-[#1a2744]" />
    </div>
  );
}

export default function DashboardPage() {
  const engines = useAuraEngines();
  const theme = useAdaptiveTheme(engines.archetype?.archetype ?? "average");

  const showRevisionSchedule = useMemo(
    () =>
      (engines.revision?.schedule ?? []).filter((item) => item.priority === "urgent").length >= 2,
    [engines.revision?.schedule],
  );

  const engineOutputs = useMemo(
    () => ({
      projection: engines.projection,
      archetype: engines.archetype,
      recovery: engines.recovery,
      target: engines.target,
      momentum: engines.momentum,
      nextAction: engines.nextAction,
      analytics: engines.analytics,
      burnout: engines.burnout,
      rank: engines.rank,
      revision: engines.revision,
    }),
    [
      engines.projection,
      engines.archetype,
      engines.recovery,
      engines.target,
      engines.momentum,
      engines.nextAction,
      engines.analytics,
      engines.burnout,
      engines.rank,
      engines.revision,
    ],
  );

  if (engines.isLoading) {
    return <AuraDashboardSkeleton />;
  }

  return (
    <AuraErrorBoundary>
      <AuraDashboard
        engines={engineOutputs}
        theme={theme}
        layoutDensity={theme.layoutDensity}
        profile={engines.profile}
        showRevisionSchedule={showRevisionSchedule}
      />
    </AuraErrorBoundary>
  );
}
