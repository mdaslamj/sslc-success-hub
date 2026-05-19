import type { SubjectAdapter } from "./types";
import { clamp } from "./types";

export const languageAdapter: SubjectAdapter = {
  subject: "languages",
  label: "Languages",
  evaluationStyle: "grammar-semantic",
  tutoringWorkflow: "model-then-imitate",
  remediationStyle: "pattern-practice",
  decay: { halfLifeDays: 21, mistakePenalty: 0.85, cleanPracticeBonus: 3 },
  predictionWeights: {
    memory: 0.2,
    reasoning: 0.22,
    tutoringContinuity: 0.15,
    weaknessSeverity: 0.18,
    recentPerformance: 0.25,
  },
  semanticRules: {
    allowAlternateMethods: true,
    requireStepShown: false,
    weighsDiagrams: false,
    weighsChronology: false,
    gatesOnGrammar: true,
    systemPromptAddendum:
      "Languages: judge grammar correctness first, then semantic fluency. A grammatically broken answer cannot receive full fluency credit even if the meaning is right.",
  },
  retentionAdjustment({ daysSincePractice, recentMistakes, confidence }) {
    // Languages need frequent exposure but tolerate small gaps well.
    const exposureGap = Math.min(14, daysSincePractice * 0.7);
    const mistakeHit = Math.min(15, recentMistakes * 3);
    const confidenceBoost = confidence > 70 ? 4 : 0;
    return -exposureGap - mistakeHit + confidenceBoost;
  },
  finalizeReadiness(base) {
    return clamp(base);
  },
};