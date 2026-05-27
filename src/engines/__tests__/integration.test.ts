import assert from "node:assert/strict";

import seedProfile from "@/data/StudentLearningProfile.json";
import { runAllEngines } from "@/engines/pipeline";
import {
  logSessionOnStorage,
  stripProfileStorage,
  toProfileStorage,
} from "@/hooks/useStudentProfile";
import type { StudentLearningProfile } from "@/types/aura-engine-contracts";

function testPracticeSessionUpdatesDashboard(): void {
  const baseStored = toProfileStorage(seedProfile as unknown as StudentLearningProfile, {});
  const { profile: baseProfile } = stripProfileStorage(baseStored);
  const beforeEngines = runAllEngines(baseProfile);
  const beforeHistoryLength = baseProfile.sessionHistory.length;
  const beforeMastery = baseProfile.chapterMastery.math?.quadratic_equations?.mastery ?? 0;
  const score = 72;

  const updatedStored = logSessionOnStorage(baseStored, {
    subject: "math",
    chapter: "quadratic_equations",
    durationMinutes: 25,
    questionsAttempted: 25,
    questionsCorrect: 18,
    hintsUsed: 1,
    retriesOnWrong: 2,
    completedPlan: true,
    panicSignal: false,
    engineType: "adaptive",
  });

  const { profile: updatedProfile } = stripProfileStorage(updatedStored);
  const afterEngines = runAllEngines(updatedProfile);
  const expectedMastery = Math.min(100, Math.round(beforeMastery * 0.7 + score * 0.3));

  assert.equal(updatedProfile.sessionHistory.length, beforeHistoryLength + 1);
  assert.equal(updatedProfile.sessionHistory.at(-1)?.score, score);
  assert.equal(updatedProfile.chapterMastery.math?.quadratic_equations?.mastery, expectedMastery);
  assert.notEqual(afterEngines.projection.percentage, beforeEngines.projection.percentage);
  assert.ok(afterEngines.momentum.totalStudyMinutes > beforeEngines.momentum.totalStudyMinutes);
  assert.equal(updatedProfile.sessionHistory.at(-1)?.chapter, "quadratic_equations");
}

export function runIntegrationTests(): void {
  testPracticeSessionUpdatesDashboard();
  console.log("integration tests passed");
}

runIntegrationTests();
