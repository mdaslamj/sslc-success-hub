import type { SubjectAdapter } from "./types";
import { clamp } from "./types";

export const mathAdapter: SubjectAdapter = {
  subject: "mathematics",
  label: "Mathematics",
  evaluationStyle: "procedural-stepwise",
  tutoringWorkflow: "worked-example",
  remediationStyle: "drill-and-formula",
  decay: { halfLifeDays: 9, mistakePenalty: 0.65, cleanPracticeBonus: 6 },
  predictionWeights: {
    memory: 0.25,
    reasoning: 0.2,
    tutoringContinuity: 0.1,
    weaknessSeverity: 0.2,
    recentPerformance: 0.25,
  },
  semanticRules: {
    allowAlternateMethods: true,
    requireStepShown: true,
    weighsDiagrams: false,
    weighsChronology: false,
    gatesOnGrammar: false,
    systemPromptAddendum:
      "Mathematics: every step must be justified. Credit alternate methods only if the chain of reasoning is complete and the final answer matches.",
  },
  retentionAdjustment({ daysSincePractice, recentMistakes, confidence }) {
    // Math decays fast without drill; mistakes compound.
    const drillPenalty = Math.min(20, daysSincePractice * 1.2);
    const mistakeHit = Math.min(20, recentMistakes * 4);
    const confidenceBoost = confidence > 70 ? 5 : 0;
    return -drillPenalty - mistakeHit + confidenceBoost;
  },
  finalizeReadiness(base) {
    // Math punishes silent stretches: floor 0, soft cap 95 (board uncertainty).
    return clamp(base * 0.95);
  },
};