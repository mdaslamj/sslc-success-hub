import { useMemo, useRef } from "react";
import type { AuraEngineOutputs, StudentLearningProfile } from "@/types/aura-engine-contracts";
import { runAllEngines } from "@/engines/pipeline";
import { useStudentProfile } from "@/hooks/useStudentProfile";

export type { AuraEngineOutputs };

function useStableProfile(profile: StudentLearningProfile): StudentLearningProfile {
  const cacheRef = useRef({ key: "", value: profile });
  const key = JSON.stringify(profile);

  if (cacheRef.current.key !== key) {
    cacheRef.current = { key, value: profile };
  }

  return cacheRef.current.value;
}

export function useAuraEngines() {
  const { profile, isLoading, updateMastery, appendSession } = useStudentProfile();
  const stableProfile = useStableProfile(profile);

  const engines = useMemo(() => runAllEngines(stableProfile), [stableProfile]);

  return {
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
    profile: stableProfile,
    isLoading,
    updateMastery,
    appendSession,
  };
}
