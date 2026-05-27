import assert from "node:assert/strict";
import {
  computeAnalyticsFromSessions,
  validateAnalyticsSeed,
  type AnalyticsResult,
} from "@/engines/analytics";
import {
  appendSessionToProfile,
  buildPracticeSessionInput,
  updateChapterMasteryEntry,
} from "@/engines/sessionLogger";
import seedProfile from "@/data/StudentLearningProfile.json";
import type { SessionRecord, StudentLearningProfile } from "@/types/aura-engine-contracts";

function assertNear(actual: number, expected: number, label: string, tolerance = 8): void {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: expected ~${expected}, got ${actual}`,
  );
}

function testEmptySessions(): void {
  const result = computeAnalyticsFromSessions([]);
  assert.equal(result.overallHealthScore, 0);
  assert.equal(result.dimensions.accuracy.score, 0);
}

function testSeedAnalytics(): void {
  const validation = validateAnalyticsSeed();
  if (!validation.pass) {
    console.error("Seed analytics errors:", validation.errors);
    console.error("Computed:", {
      overall: validation.output.overallHealthScore,
      consistency: validation.output.dimensions.consistency.score,
      accuracy: validation.output.dimensions.accuracy.score,
      recovery: validation.output.dimensions.recovery.score,
      momentum: validation.output.dimensions.momentum.score,
      discipline: validation.output.dimensions.discipline.score,
      confidenceStability: validation.output.dimensions.confidenceStability.score,
    });
  }
  assert.ok(validation.pass, validation.errors.join("; "));

  const { output } = validation;
  assertNear(output.overallHealthScore, 66, "overallHealthScore");
  assertNear(output.dimensions.consistency.score, 68, "consistency");
  assertNear(output.dimensions.accuracy.score, 71, "accuracy");
  assertNear(output.dimensions.recovery.score, 58, "recovery");
  assertNear(output.dimensions.momentum.score, 64, "momentum");
  assertNear(output.dimensions.discipline.score, 60, "discipline");
  assertNear(output.dimensions.confidenceStability.score, 63, "confidenceStability");
}

function testAllDimensionsPresent(result: AnalyticsResult): void {
  const keys = [
    "consistency",
    "accuracy",
    "recovery",
    "momentum",
    "discipline",
    "confidenceStability",
  ] as const;
  keys.forEach((key) => {
    assert.ok(result.dimensions[key].score >= 0);
    assert.ok(result.dimensions[key].signals.length > 0);
  });
}

function testAppendSessionUpdatesMastery(): void {
  const profile = seedProfile as StudentLearningProfile;
  const before = profile.chapterMastery.science.electricity?.mastery ?? 0;

  const next = appendSessionToProfile(
    profile,
    buildPracticeSessionInput({
      date: "2025-05-28",
      subject: "science",
      chapter: "electricity",
      durationMinutes: 40,
      questionsAttempted: 10,
      questionsCorrect: 8,
      engineType: "recovery",
      panicSignal: false,
    }),
  );

  assert.equal(next.sessionHistory.length, profile.sessionHistory.length + 1);
  assert.ok(next.chapterMastery.science.electricity!.mastery >= before);
  assert.equal(next.chapterMastery.science.electricity!.attemptCount, 6);
}

function testMasteryTrendImprovesOnStrongSession(): void {
  const updated = updateChapterMasteryEntry(
    { mastery: 44, trend: "declining", lastPracticed: "2025-05-27", attemptCount: 5 },
    buildPracticeSessionInput({
      date: "2025-05-28",
      subject: "science",
      chapter: "electricity",
      durationMinutes: 40,
      questionsAttempted: 10,
      questionsCorrect: 9,
      engineType: "recovery",
    }),
  );

  assert.ok(updated.mastery > 44);
  assert.equal(updated.trend, "improving");
}

function testPanicSessionsLowerConfidence(): void {
  const stable: SessionRecord[] = [
    {
      id: "s1",
      date: "2025-05-01",
      subject: "math",
      chapter: "triangles",
      durationMinutes: 40,
      questionsAttempted: 10,
      questionsCorrect: 8,
      score: 80,
      hintsUsed: 1,
      retriesOnWrong: 1,
      completedPlan: true,
      panicSignal: false,
      engineType: "adaptive",
    },
    {
      id: "s2",
      date: "2025-05-02",
      subject: "math",
      chapter: "triangles",
      durationMinutes: 40,
      questionsAttempted: 10,
      questionsCorrect: 8,
      score: 82,
      hintsUsed: 1,
      retriesOnWrong: 1,
      completedPlan: true,
      panicSignal: false,
      engineType: "adaptive",
    },
  ];

  const unstable: SessionRecord[] = [
    ...stable,
    {
      id: "s3",
      date: "2025-05-03",
      subject: "science",
      chapter: "electricity",
      durationMinutes: 40,
      questionsAttempted: 10,
      questionsCorrect: 4,
      score: 40,
      hintsUsed: 6,
      retriesOnWrong: 7,
      completedPlan: true,
      panicSignal: true,
      engineType: "timed_test",
    },
  ];

  const stableScore = computeAnalyticsFromSessions(stable).dimensions.confidenceStability.score;
  const unstableScore =
    computeAnalyticsFromSessions(unstable).dimensions.confidenceStability.score;
  assert.ok(unstableScore < stableScore);
}

export function runAnalyticsTests(): void {
  testEmptySessions();
  testSeedAnalytics();
  testAllDimensionsPresent(computeAnalyticsFromSessions((seedProfile as StudentLearningProfile).sessionHistory));
  testAppendSessionUpdatesMastery();
  testMasteryTrendImprovesOnStrongSession();
  testPanicSessionsLowerConfidence();
  console.log("analytics + sessionLogger tests passed");
}

runAnalyticsTests();
