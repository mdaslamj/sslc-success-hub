import { useMemo } from "react";
import { AuraDashboard } from "@/components/dashboard/AuraDashboard";
import { useAdaptiveTheme } from "@/hooks/useAdaptiveTheme";
import { useAuraEngines } from "@/hooks/useAuraEngines";

const placeholderStyle = {
  height: "160px",
  width: "100%",
  background: "var(--color-background-secondary)",
  borderRadius: "var(--border-radius-lg)",
} as const;

function AuraDashboardSkeleton() {
  return (
    <div
      className="flex h-[calc(100vh-4rem)] flex-col gap-3 overflow-hidden bg-[#020817] p-4"
      style={{ fontFamily: "DM Sans, sans-serif" }}
    >
      <div style={placeholderStyle} />
      <div style={placeholderStyle} />
      <div style={placeholderStyle} />
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
    <AuraDashboard
      engines={engineOutputs}
      theme={theme}
      layoutDensity={theme.layoutDensity}
      profile={engines.profile}
      showRevisionSchedule={showRevisionSchedule}
    />
  );
}
