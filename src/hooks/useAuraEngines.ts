import { useMemo } from "react";
import type {
  AuraEngineOutputs,
  StudentLearningProfile,
} from "@/types/aura-engine-contracts";
import { runAllEngines } from "@/engines/pipeline";
import { useStudentProfile } from "@/hooks/useStudentProfile";

export type { AuraEngineOutputs };

const CACHE_KEY_PREFIX = "aura_engines_";

function hashProfile(profile: StudentLearningProfile): string {
  const key = JSON.stringify({
    chapterMastery: profile.chapterMastery,
    sessionHistory: profile.sessionHistory?.slice(-10),
    subjectTargets: profile.subjectTargets,
    student: profile.student,
  });
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) + hash + key.charCodeAt(i);
    hash = hash & hash;
  }
  return hash.toString(36);
}

function getCachedEngines(profileHash: string): AuraEngineOutputs | null {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY_PREFIX + profileHash);
    if (cached) return JSON.parse(cached) as AuraEngineOutputs;
  } catch {
    /* ignore */
  }
  return null;
}

function setCachedEngines(profileHash: string, result: AuraEngineOutputs): void {
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(CACHE_KEY_PREFIX))
      .forEach((k) => sessionStorage.removeItem(k));
    sessionStorage.setItem(CACHE_KEY_PREFIX + profileHash, JSON.stringify(result));
  } catch {
    /* ignore if storage full */
  }
}

export function useAuraEngines() {
  const { profile, isLoading, updateMastery, appendSession, updateProfile } =
    useStudentProfile();

  const engines = useMemo(() => {
    if (!profile) return null;
    const hash = hashProfile(profile);
    const cached = getCachedEngines(hash);
    if (cached) return cached;
    const result = runAllEngines(profile);
    setCachedEngines(hash, result);
    return result;
  }, [profile]);

  const output = engines ?? runAllEngines(profile);

  return {
    projection: output.projection,
    archetype: output.archetype,
    recovery: output.recovery,
    target: output.target,
    momentum: output.momentum,
    nextAction: output.nextAction,
    analytics: output.analytics,
    burnout: output.burnout,
    rank: output.rank,
    revision: output.revision,
    profile,
    isLoading,
    updateMastery,
    appendSession,
    updateProfile,
  };
}
