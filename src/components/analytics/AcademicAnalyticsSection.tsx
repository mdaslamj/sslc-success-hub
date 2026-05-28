import { useMemo } from "react";
import AuraAnalytics from "@/components/AuraAnalytics";
import { buildAcademicAnalyticsView } from "@/core/academic-state/analyticsView";
import { useAuraEngines } from "@/hooks/useAuraEngines";

export function AcademicAnalyticsSection() {
  const { profile, projection, target, momentum, burnout, analytics, isLoading } =
    useAuraEngines();

  const view = useMemo(
    () =>
      buildAcademicAnalyticsView(profile, {
        projection,
        target,
        momentum,
        burnout,
        analytics,
      }),
    [profile, projection, target, momentum, burnout, analytics],
  );

  if (isLoading) {
    return (
      <div
        className="flex h-64 items-center justify-center rounded-2xl border border-border/60 bg-card text-sm text-muted-foreground"
        aria-busy="true"
      >
        Loading academic analytics…
      </div>
    );
  }

  return <AuraAnalytics view={view} />;
}
