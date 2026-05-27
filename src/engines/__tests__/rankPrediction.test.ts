import assert from "node:assert/strict";
import { rankPredictionEngine } from "@/engines/rankPrediction";
import { runScoreProjectionFromSeed } from "@/engines/scoreProjection";

function testSeedProfileAverageBand(): void {
  const projection = runScoreProjectionFromSeed();
  const result = rankPredictionEngine(projection);

  assert.equal(result.stateAvgScore, 68);
  assert.ok(result.estimatedRank === "Average" || result.estimatedRank === "Top 25%");
  assert.ok(result.predictedPercentile >= 0 && result.predictedPercentile <= 100);
  assert.ok(result.gapToTopTen >= 0);
  assert.ok(result.gapToTopOne >= result.gapToTopTen);
  assert.ok(result.confidence >= 0 && result.confidence <= 1);
}

function testTopTenBand(): void {
  const projection = runScoreProjectionFromSeed();
  const boosted = {
    ...projection,
    percentage: 87,
    total: (87 / 100) * projection.totalMax,
  };
  const result = rankPredictionEngine(boosted);

  assert.equal(result.estimatedRank, "Top 10%");
  assert.equal(result.gapToTopTen, 0);
  assert.ok(result.gapToTopOne > 0);
}

function testTopOneBand(): void {
  const projection = runScoreProjectionFromSeed();
  const boosted = {
    ...projection,
    percentage: 96,
    total: (96 / 100) * projection.totalMax,
  };
  const result = rankPredictionEngine(boosted);

  assert.equal(result.estimatedRank, "Top 1%");
  assert.equal(result.gapToTopOne, 0);
  assert.equal(result.gapToTopTen, 0);
}

export function runRankPredictionTests(): void {
  testSeedProfileAverageBand();
  testTopTenBand();
  testTopOneBand();
  console.log("rankPrediction tests passed");
}

runRankPredictionTests();
