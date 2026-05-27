import assert from "node:assert/strict";
import seedProfile from "@/data/StudentLearningProfile.json";
import { computeAnalyticsFromSessions } from "@/engines/analytics";
import { burnoutDetectionEngine } from "@/engines/burnoutDetection";
import { momentumEngine } from "@/engines/momentum";
import type { SessionRecord, StudentLearningProfile } from "@/types/aura-engine-contracts";

function testSeedProfileBurnoutRiskBand(): void {
  const profile = seedProfile as unknown as StudentLearningProfile;
  const analytics = computeAnalyticsFromSessions(profile.sessionHistory);
  const momentum = momentumEngine(profile.sessionHistory);
  const result = burnoutDetectionEngine(analytics, profile.sessionHistory, momentum);

  assert.ok(["low", "medium", "high"].includes(result.risk));
  assert.ok(result.score >= 0 && result.score <= 100);
  assert.ok(result.recommendation.length > 0);
  assert.ok(result.recoveryAction.length > 0);
  assert.ok(Array.isArray(result.activeSignals));
}

function testBurnoutHighRiskSignals(): void {
  const sessions: SessionRecord[] = [
    {
      id: "s1",
      date: "2025-05-20",
      subject: "math",
      chapter: "triangles",
      durationMinutes: 40,
      questionsAttempted: 10,
      questionsCorrect: 8,
      score: 80,
      hintsUsed: 0,
      retriesOnWrong: 0,
      completedPlan: false,
      panicSignal: true,
      engineType: "adaptive",
    },
    {
      id: "s2",
      date: "2025-05-21",
      subject: "math",
      chapter: "triangles",
      durationMinutes: 35,
      questionsAttempted: 10,
      questionsCorrect: 6,
      score: 60,
      hintsUsed: 2,
      retriesOnWrong: 3,
      completedPlan: false,
      panicSignal: true,
      engineType: "adaptive",
    },
    {
      id: "s3",
      date: "2025-05-22",
      subject: "math",
      chapter: "triangles",
      durationMinutes: 30,
      questionsAttempted: 10,
      questionsCorrect: 5,
      score: 50,
      hintsUsed: 3,
      retriesOnWrong: 4,
      completedPlan: false,
      panicSignal: true,
      engineType: "adaptive",
    },
    {
      id: "s4",
      date: "2025-05-23",
      subject: "math",
      chapter: "triangles",
      durationMinutes: 25,
      questionsAttempted: 10,
      questionsCorrect: 4,
      score: 40,
      hintsUsed: 4,
      retriesOnWrong: 5,
      completedPlan: false,
      panicSignal: true,
      engineType: "adaptive",
    },
    {
      id: "s5",
      date: "2025-05-24",
      subject: "math",
      chapter: "triangles",
      durationMinutes: 20,
      questionsAttempted: 10,
      questionsCorrect: 3,
      score: 30,
      hintsUsed: 5,
      retriesOnWrong: 6,
      completedPlan: false,
      panicSignal: true,
      engineType: "adaptive",
    },
    {
      id: "s6",
      date: "2025-05-25",
      subject: null,
      chapter: null,
      durationMinutes: 0,
      questionsAttempted: 0,
      questionsCorrect: 0,
      score: null,
      hintsUsed: 0,
      retriesOnWrong: 0,
      completedPlan: false,
      panicSignal: false,
      engineType: null,
    },
    {
      id: "s7",
      date: "2025-05-26",
      subject: null,
      chapter: null,
      durationMinutes: 0,
      questionsAttempted: 0,
      questionsCorrect: 0,
      score: null,
      hintsUsed: 0,
      retriesOnWrong: 0,
      completedPlan: false,
      panicSignal: false,
      engineType: null,
    },
  ];

  const analytics = computeAnalyticsFromSessions(sessions);
  const momentum = momentumEngine(sessions);
  const result = burnoutDetectionEngine(analytics, sessions, momentum);

  assert.ok(result.score >= 30);
  assert.ok(result.activeSignals.length > 0);
}

export function runBurnoutDetectionTests(): void {
  testSeedProfileBurnoutRiskBand();
  testBurnoutHighRiskSignals();
  console.log("burnoutDetection tests passed");
}

runBurnoutDetectionTests();
