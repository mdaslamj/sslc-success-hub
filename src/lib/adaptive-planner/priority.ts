import type {
  InterventionTriggerKey,
  WeaknessProfileDoc,
} from "@/integrations/firebase/types";

export type PriorityInput = {
  profile: WeaknessProfileDoc;
  /** 0..1 — board frequency / weightage for this chapter. */
  boardWeight?: number;
  /** Optional previous confidence (to detect decline). */
  previousConfidence?: number;
  /** Days until the next board / mock exam. */
  daysToExam?: number;
};

export type PriorityBreakdown = {
  priorityScore: number; // 0..100
  triggers: InterventionTriggerKey[];
  scoring: {
    weaknessWeight: number;
    boardWeight: number;
    mistakeSeverity: number;
    confidenceDecline: number;
    examProximity: number;
    marksAtRisk: number;
  };
};

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

/**
 * Score a chapter's intervention urgency from its weakness profile + context.
 * Pure. Bigger score = more urgent.
 */
export function scoreInterventionPriority(input: PriorityInput): PriorityBreakdown {
  const { profile, boardWeight = 0.5, previousConfidence, daysToExam } = input;

  // Weakness severity — average of the worst two layers, 0..100.
  const layers = Object.values(profile.weaknessLayers).sort((a, b) => b - a);
  const weaknessWeight = clamp(((layers[0] ?? 0) + (layers[1] ?? 0)) / 2);

  const boardComponent = clamp(boardWeight * 100);

  // Mistake severity — capped sum of repeated mistakes, normalized to 0..100.
  const mistakeCount = Object.values(profile.repeatedMistakes).reduce(
    (a, b) => a + b,
    0,
  );
  const mistakeSeverity = clamp(Math.min(mistakeCount, 20) * 5);

  // Confidence decline — compare against previous snapshot or last trend point.
  const trendPrev =
    profile.masteryTrend.length > 1
      ? profile.masteryTrend[profile.masteryTrend.length - 2].mastery
      : profile.confidenceScore;
  const baseline = previousConfidence ?? trendPrev;
  const confidenceDecline = clamp(Math.max(0, baseline - profile.confidenceScore) * 2);

  // Exam proximity — closer exam = higher urgency. Saturates at 1 day.
  const examProximity =
    typeof daysToExam === "number"
      ? clamp(100 - Math.min(daysToExam, 60) * (100 / 60))
      : 0;

  const marksAtRisk = clamp(profile.marksAtRisk * 10);

  // Weighted sum — components sum to 1.0 so the result lives in 0..100.
  const priorityScore = +clamp(
    weaknessWeight * 0.3 +
      boardComponent * 0.2 +
      mistakeSeverity * 0.15 +
      confidenceDecline * 0.15 +
      examProximity * 0.1 +
      marksAtRisk * 0.1,
  ).toFixed(1);

  const triggers: InterventionTriggerKey[] = [];
  if (profile.repeatedMistakes.signError >= 2) triggers.push("repeatedSignError");
  if (profile.repeatedMistakes.skippedSteps >= 2) triggers.push("skippedSteps");
  if (profile.repeatedMistakes.formulaMisuse >= 2) triggers.push("formulaMisuse");
  if (profile.confidenceScore < 45) triggers.push("lowConfidence");
  if (profile.marksAtRisk >= 3) triggers.push("highMarksAtRisk");
  if (confidenceDecline > 20) triggers.push("confidenceDecline");
  if (boardWeight >= 0.7 && profile.confidenceScore < 60) {
    triggers.push("boardPriorityWeak");
  }

  return {
    priorityScore,
    triggers,
    scoring: {
      weaknessWeight: +weaknessWeight.toFixed(1),
      boardWeight: +boardComponent.toFixed(1),
      mistakeSeverity: +mistakeSeverity.toFixed(1),
      confidenceDecline: +confidenceDecline.toFixed(1),
      examProximity: +examProximity.toFixed(1),
      marksAtRisk: +marksAtRisk.toFixed(1),
    },
  };
}