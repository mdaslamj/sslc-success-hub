import type { SubjectAdapter } from "./types";
import { clamp } from "./types";

export const scienceAdapter: SubjectAdapter = {
  subject: "science",
  label: "Science",
  evaluationStyle: "conceptual-diagrammatic",
  tutoringWorkflow: "concept-then-diagram",
  remediationStyle: "misconception-repair",
  decay: { halfLifeDays: 14, mistakePenalty: 0.75, cleanPracticeBonus: 5 },
  predictionWeights: {
    memory: 0.22,
    reasoning: 0.25,
    tutoringContinuity: 0.13,
    weaknessSeverity: 0.2,
    recentPerformance: 0.2,
  },
  semanticRules: {
    allowAlternateMethods: true,
    requireStepShown: false,
    weighsDiagrams: true,
    weighsChronology: false,
    gatesOnGrammar: false,
    systemPromptAddendum:
      "Science: prioritise conceptual understanding. A labelled diagram or accurate analogy can stand in for a verbal step. Surface misconceptions explicitly.",
  },
  retentionAdjustment({ daysSincePractice, recentMistakes, confidence }) {
    // Concepts decay slower than formulas, but misconceptions linger.
    const drillPenalty = Math.min(15, daysSincePractice * 0.8);
    const mistakeHit = Math.min(22, recentMistakes * 5);
    const confidenceBoost = confidence > 60 ? 4 : 0;
    return -drillPenalty - mistakeHit + confidenceBoost;
  },
  finalizeReadiness(base) {
    return clamp(base);
  },
};