import assert from "node:assert/strict";

import seedProfile from "@/data/StudentLearningProfile.json";
import { nextActionEngine } from "@/engines/nextAction";
import { runAllEngines } from "@/engines/pipeline";
import { recoveryEngine, runRecoveryFromSeed } from "@/engines/recovery";
import { loadSeedBlueprint, scoreProjectionEngine } from "@/engines/scoreProjection";
import { studentArchetypeEngine } from "@/engines/studentArchetype";
import { momentumEngine } from "@/engines/momentum";
import { runTargetGapFromSeed } from "@/engines/targetGap";
import type { StudentLearningProfile } from "@/types/aura-engine-contracts";

function testSampleProfileElectricityRecovery(): void {
  const profile = seedProfile as unknown as StudentLearningProfile;
  const blueprint = loadSeedBlueprint();
  const projection = scoreProjectionEngine(profile.chapterMastery, blueprint);
  const recovery = runRecoveryFromSeed();
  const target = runTargetGapFromSeed();
  const momentum = momentumEngine(profile.sessionHistory);
  const archetype = studentArchetypeEngine(profile.sessionHistory, projection);

  const result = nextActionEngine(recovery, target, momentum, archetype, profile.sessionHistory);

  assert.equal(result.chapter, "electricity");
  assert.equal(result.subject, "science");
  assert.equal(result.sessionType, "concept_review");
  assert.equal(result.urgency, "critical");

  const electricity = recovery.items.find((item) => item.chapter === "electricity");
  assert.ok(electricity);
  assert.equal(electricity!.blueprintMarks, 8);
  assert.equal(electricity!.urgency, "critical");
  assert.equal(result.timeRequired, electricity!.sessionsNeeded * 20);
  assert.match(result.estimatedGain, /^\+[\d.]+ marks$/);
}

function testFollowUpQuadraticEquations(): void {
  const profile = seedProfile as unknown as StudentLearningProfile;
  const blueprint = loadSeedBlueprint();
  const projection = scoreProjectionEngine(profile.chapterMastery, blueprint);
  const recovery = recoveryEngine(profile.chapterMastery, blueprint, profile.sessionHistory);
  const target = runTargetGapFromSeed();
  const momentum = momentumEngine(profile.sessionHistory);
  const archetype = studentArchetypeEngine(profile.sessionHistory, projection);

  const result = nextActionEngine(recovery, target, momentum, archetype, profile.sessionHistory);

  assert.ok(result.followUp);
  assert.equal(result.followUp!.chapter, "quadratic_equations");
  assert.equal(result.followUp!.subject, "math");
}

function testConfidenceRange(): void {
  const outputs = runAllEngines(seedProfile as unknown as StudentLearningProfile);

  assert.ok(outputs.nextAction.confidence >= 0.7);
  assert.ok(outputs.nextAction.confidence <= 0.9);
}

export function runNextActionTests(): void {
  testSampleProfileElectricityRecovery();
  testFollowUpQuadraticEquations();
  testConfidenceRange();
  console.log("nextAction tests passed");
}

runNextActionTests();
