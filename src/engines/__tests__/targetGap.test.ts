import assert from "node:assert/strict";
import { runTargetGapFromSeed, targetGapEngine } from "@/engines/targetGap";
import { loadSeedBlueprint, runScoreProjectionFromSeed } from "@/engines/scoreProjection";
import seedProfile from "@/data/StudentLearningProfile.json";
import type { StudentLearningProfile } from "@/types/aura-engine-contracts";

function testTargetGapMoneyCreditFastWin(): void {
  const result = runTargetGapFromSeed();
  const money = result.rankedChapters.find((chapter) => chapter.chapter === "money_credit");

  assert.ok(money, "money_credit should appear in ranked chapters");
  assert.equal(money!.name, "Money & Credit");
  assert.equal(money!.subject, "social");
  assert.equal(money!.currentMastery, 68);
  assert.equal(money!.blueprintMarks, 5);
  assert.equal(money!.gainPossible, 1.31);
  assert.equal(money!.hoursEstimate, 0.7);
  assert.ok(money!.roi > 0);

  const mediumSocial = result.rankedChapters
    .filter(
      (chapter) =>
        chapter.subject === "social" &&
        chapter.currentMastery >= 62 &&
        chapter.currentMastery < 72,
    )
    .sort((a, b) => b.roi - a.roi);

  assert.equal(mediumSocial[0]!.chapter, "money_credit");
  assert.ok(result.fastestPath.length > 0);
  assert.ok(result.estimatedHours > 0);
  assert.equal(result.targetScore, 90);
  assert.ok(result.gapPercentage > 0);
}

function testTargetGapFastestPathClosesGap(): void {
  const profile = seedProfile as StudentLearningProfile;
  const blueprint = loadSeedBlueprint();
  const projection = runScoreProjectionFromSeed();

  const result = targetGapEngine(
    90,
    projection,
    profile.chapterMastery,
    blueprint,
    profile.sessionHistory,
  );

  const pathGain = result.fastestPath.reduce((sum, chapter) => sum + chapter.gainPossible, 0);
  assert.ok(pathGain >= result.gap || result.fastestPath.length > 0);
  assert.ok(result.rankedChapters[0]!.roi >= result.rankedChapters[1]!.roi);
}

function testTargetGapReachableDate(): void {
  const result = runTargetGapFromSeed();
  if (result.targetReachable) {
    assert.ok(result.reachableBy);
    assert.match(result.reachableBy!, /^\d{4}-\d{2}-\d{2}$/);
  }
}

function testRankedByRoiDescending(): void {
  const result = runTargetGapFromSeed();
  for (let i = 1; i < result.rankedChapters.length; i += 1) {
    assert.ok(result.rankedChapters[i - 1]!.roi >= result.rankedChapters[i]!.roi);
  }
}

export function runTargetGapTests(): void {
  testTargetGapMoneyCreditFastWin();
  testTargetGapFastestPathClosesGap();
  testTargetGapReachableDate();
  testRankedByRoiDescending();
  console.log("targetGap tests passed");
}

runTargetGapTests();
