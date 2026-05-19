import type { SubjectAdapter } from "./types";
import { clamp } from "./types";

export const socialScienceAdapter: SubjectAdapter = {
  subject: "social-science",
  label: "Social Science",
  evaluationStyle: "narrative-chronological",
  tutoringWorkflow: "story-then-timeline",
  remediationStyle: "context-reframe",
  decay: { halfLifeDays: 18, mistakePenalty: 0.8, cleanPracticeBonus: 4 },
  predictionWeights: {
    memory: 0.3,
    reasoning: 0.18,
    tutoringContinuity: 0.12,
    weaknessSeverity: 0.18,
    recentPerformance: 0.22,
  },
  semanticRules: {
    allowAlternateMethods: false,
    requireStepShown: false,
    weighsDiagrams: false,
    weighsChronology: true,
    gatesOnGrammar: false,
    systemPromptAddendum:
      "Social Science: weight cause→event→effect chains and chronological accuracy. Dates and sequence matter; a confident but anachronistic answer is incorrect.",
  },
  retentionAdjustment({ daysSincePractice, recentMistakes, confidence }) {
    // Narrative content fades gracefully but date-confusion is sticky.
    const fade = Math.min(12, daysSincePractice * 0.6);
    const mistakeHit = Math.min(18, recentMistakes * 3.5);
    const confidenceBoost = confidence > 65 ? 3 : 0;
    return -fade - mistakeHit + confidenceBoost;
  },
  finalizeReadiness(base) {
    return clamp(base);
  },
};