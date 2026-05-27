import { useMemo } from "react";
import type { AuraEngineOutputs } from "@/types/aura-engine-contracts";
import { runAllEngines } from "@/engines/pipeline";
import { useStudentProfile } from "@/hooks/useStudentProfile";

export type { AuraEngineOutputs };

export function useAuraEngines() {
  const { profile, updateMastery, appendSession } = useStudentProfile();

  const engines = useMemo(() => runAllEngines(profile), [profile]);

  return {
    projection: engines.projection,
    archetype: engines.archetype,
    recovery: engines.recovery,
    target: engines.target,
    momentum: engines.momentum,
    nextAction: engines.nextAction,
    analytics: engines.analytics,
    profile,
    updateMastery,
    appendSession,
  };
}
