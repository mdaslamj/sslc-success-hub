import { useMemo } from "react";
import { AuraDashboard } from "@/components/dashboard/AuraDashboard";
import { useAdaptiveTheme } from "@/hooks/useAdaptiveTheme";
import { useAuraEngines } from "@/hooks/useAuraEngines";

export default function DashboardPage() {
  const engines = useAuraEngines();
  const theme = useAdaptiveTheme(engines.archetype.archetype);

  const engineOutputs = useMemo(
    () => ({
      projection: engines.projection,
      archetype: engines.archetype,
      recovery: engines.recovery,
      target: engines.target,
      momentum: engines.momentum,
      nextAction: engines.nextAction,
      analytics: engines.analytics,
    }),
    [
      engines.projection,
      engines.archetype,
      engines.recovery,
      engines.target,
      engines.momentum,
      engines.nextAction,
      engines.analytics,
    ],
  );

  return <AuraDashboard engines={engineOutputs} theme={theme} />;
}
