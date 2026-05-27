import type {
  AuraEngineOutputs,
  StudentLearningProfile,
} from "@/types/aura-engine-contracts";

import { computeAnalyticsFromSessions } from "@/engines/analytics";
import { burnoutDetectionEngine } from "@/engines/burnoutDetection";
import { momentumEngine } from "@/engines/momentum";
import { nextActionEngine } from "@/engines/nextAction";
import { rankPredictionEngine } from "@/engines/rankPrediction";
import { recoveryEngine } from "@/engines/recovery";
import { revisionOptimizerEngine } from "@/engines/revisionOptimizer";
import {
  loadSeedBlueprint,
  scoreProjectionEngine,
} from "@/engines/scoreProjection";
import { studentArchetypeEngine } from "@/engines/studentArchetype";
import { targetGapEngine } from "@/engines/targetGap";

export function runAllEngines(profile: StudentLearningProfile): AuraEngineOutputs {
  const blueprint = profile.blueprint ?? loadSeedBlueprint();
  const sessions = profile.sessionHistory ?? [];

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
  const burnout = burnoutDetectionEngine(analytics, sessions, momentum);
  const rank = rankPredictionEngine(projection);
  const revision = revisionOptimizerEngine(profile.chapterMastery, blueprint, sessions);

  return {
    projection,
    archetype,
    recovery,
    target,
    momentum,
    nextAction,
    analytics,
    burnout,
    rank,
    revision,
  };
}
