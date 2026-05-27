import type { RankPredictionOutput, ScoreProjectionOutput } from "@/types/aura-engine-contracts";

const STATE_AVG_SCORE = 68;
const TOP_ONE_THRESHOLD = 95;
const TOP_FIVE_THRESHOLD = 90;
const TOP_TEN_THRESHOLD = 85;
const TOP_TWENTY_FIVE_THRESHOLD = 75;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function estimatedRankFor(score: number): RankPredictionOutput["estimatedRank"] {
  if (score >= TOP_ONE_THRESHOLD) return "Top 1%";
  if (score >= TOP_FIVE_THRESHOLD) return "Top 5%";
  if (score >= TOP_TEN_THRESHOLD) return "Top 10%";
  if (score >= TOP_TWENTY_FIVE_THRESHOLD) return "Top 25%";
  return "Average";
}

function percentileFor(score: number): number {
  if (score >= TOP_ONE_THRESHOLD) return 99;
  if (score >= TOP_FIVE_THRESHOLD) return 95;
  if (score >= TOP_TEN_THRESHOLD) return 90;
  if (score >= TOP_TWENTY_FIVE_THRESHOLD) return 80;
  if (score >= STATE_AVG_SCORE) return 55;
  return Math.max(10, round1(((score / STATE_AVG_SCORE) * 50)));
}

function marksForPercent(projection: ScoreProjectionOutput, percent: number): number {
  return round2((percent / 100) * projection.totalMax);
}

function confidenceFor(score: number): number {
  const distanceToBandEdge = Math.min(
    Math.abs(score - TOP_ONE_THRESHOLD),
    Math.abs(score - TOP_FIVE_THRESHOLD),
    Math.abs(score - TOP_TEN_THRESHOLD),
    Math.abs(score - TOP_TWENTY_FIVE_THRESHOLD),
    Math.abs(score - STATE_AVG_SCORE),
  );
  return round2(Math.min(0.95, 0.65 + distanceToBandEdge / 100));
}

export function rankPredictionEngine(projection: ScoreProjectionOutput): RankPredictionOutput {
  const score = round1(projection.percentage);
  const currentMarks = round2(projection.total);
  const topTenMarks = marksForPercent(projection, TOP_TEN_THRESHOLD);
  const topOneMarks = marksForPercent(projection, TOP_ONE_THRESHOLD);

  return {
    predictedPercentile: percentileFor(score),
    estimatedRank: estimatedRankFor(score),
    stateAvgScore: STATE_AVG_SCORE,
    gapToTopTen: round2(Math.max(0, topTenMarks - currentMarks)),
    gapToTopOne: round2(Math.max(0, topOneMarks - currentMarks)),
    confidence: confidenceFor(score),
  };
}
