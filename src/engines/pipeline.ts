import type {
  AuraEngineOutputs,
  StudentLearningProfile,
} from "@/types/aura-engine-contracts";

import { computeAnalyticsFromSessions } from "@/engines/analytics";
import { momentumEngine } from "@/engines/momentum";
import { nextActionEngine } from "@/engines/nextAction";
import { recoveryEngine } from "@/engines/recovery";
import {
  loadSeedBlueprint,
  scoreProjectionEngine,
} from "@/engines/scoreProjection";
import { studentArchetypeEngine } from "@/engines/studentArchetype";
import { targetGapEngine } from "@/engines/targetGap";

export function runAllEngines(profile: StudentLearningProfile): AuraEngineOutputs {
  const blueprint = profile.blueprint ?? loadSeedBlueprint();
  const sessions = profile.sessionHistory;

  const projection = scoreProjectionEngine(profile.chapterMastery, blueprint);
  const archetype = studentArchetypeEngine(sessions, projection);
  const recovery = recoveryEngine(profile.chapterMastery, blueprint, sessions);
  const target = targetGapEngine(
    profile.student.targetScore,
    projection,
    profile.chapterMastery,
    blueprint,
    sessions,
  );
  const momentum = momentumEngine(sessions);
  const nextAction = nextActionEngine(recovery, target, momentum, archetype, sessions);
  const analytics = computeAnalyticsFromSessions(sessions);

  return {
    projection,
    archetype,
    recovery,
    target,
    momentum,
    nextAction,
    analytics,
    profile,
  };
}
