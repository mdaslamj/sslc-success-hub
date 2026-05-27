import assert from "node:assert/strict";
import seedProfile from "@/data/StudentLearningProfile.json";
import { loadSeedBlueprint } from "@/engines/scoreProjection";
import { revisionOptimizerEngine } from "@/engines/revisionOptimizer";
import type { StudentLearningProfile } from "@/types/aura-engine-contracts";

export function runRevisionOptimizerTests(): void {
  const profile = seedProfile as unknown as StudentLearningProfile;
  const result = revisionOptimizerEngine(
    profile.chapterMastery,
    loadSeedBlueprint(),
    profile.sessionHistory,
  );

  assert.ok(result.schedule.length > 0);
  assert.ok(result.schedule.length <= 10);
  assert.equal(result.schedule.find((item) => item.chapter === "electricity")?.intervalDays, 1);
  console.log("revisionOptimizer tests passed");
}

runRevisionOptimizerTests();
