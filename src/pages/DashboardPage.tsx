import { useMemo } from "react";
import { AuraDashboard } from "@/components/dashboard/AuraDashboard";
import { useAdaptiveTheme } from "@/hooks/useAdaptiveTheme";
import { useAuraEngines } from "@/hooks/useAuraEngines";

export default function DashboardPage() {
  const engines = useAuraEngines();
  const theme = useAdaptiveTheme(engines.archetype.archetype);

  const showRevisionSchedule = useMemo(
    () => engines.revision.schedule.filter((item) => item.priority === "urgent").length >= 2,
    [engines.revision.schedule],
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
