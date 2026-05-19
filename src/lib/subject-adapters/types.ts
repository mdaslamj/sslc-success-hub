/**
 * Subject Capability Adapter contracts.
 *
 * Each subject (math, science, social science, languages) plugs into the
 * shared backbone (planner, memory tracking, prediction engine, tutoring
 * continuity) but overrides the *style* of evaluation, tutoring,
 * remediation, decay, prediction weighting, and semantic reasoning.
 *
 * Adapters are pure data + pure functions. No Firestore reads, no UI.
 */

export type SubjectKey =
  | "mathematics"
  | "science"
  | "social-science"
  | "languages";

export type EvaluationStyle =
  | "procedural-stepwise" // math: each step earns marks; final answer checked
  | "conceptual-diagrammatic" // science: explanation + labelled diagram
  | "narrative-chronological" // social: cause→event→effect, dates matter
  | "grammar-semantic"; // language: grammar rules + meaning fluency

export type TutoringWorkflow =
  | "worked-example" // show solved example, then guided practice
  | "concept-then-diagram" // explain concept, then walk a diagram
  | "story-then-timeline" // tell the story, then anchor on dates
  | "model-then-imitate"; // model sentence, student imitates

export type RemediationStyle =
  | "drill-and-formula" // re-drill formulas + similar problems
  | "misconception-repair" // surface and correct misconception
  | "context-reframe" // re-tell the narrative in a fresh frame
  | "pattern-practice"; // grammar drills, vocab spaced repetition

export type DecayProfile = {
  /** Half-life in days for confidence decay without practice. */
  halfLifeDays: number;
  /** Penalty multiplier applied after a fresh mistake (0..1, lower = harsher). */
  mistakePenalty: number;
  /** Bonus applied to retention after a clean practice (additive 0..100). */
  cleanPracticeBonus: number;
};

export type PredictionWeights = {
  memory: number;
  reasoning: number;
  tutoringContinuity: number;
  weaknessSeverity: number;
  recentPerformance: number;
};

export type SemanticReasoningRules = {
  /** Allow LLM to credit alternate methods that reach the same answer. */
  allowAlternateMethods: boolean;
  /** Penalise missing intermediate steps (true for math, false for languages). */
  requireStepShown: boolean;
  /** Weight diagram/visual reasoning when present (science). */
  weighsDiagrams: boolean;
  /** Chronology / dates matter (social science). */
  weighsChronology: boolean;
  /** Grammar correctness gates fluency credit (languages). */
  gatesOnGrammar: boolean;
  /** Extra system prompt fragment appended to the semantic guardrail. */
  systemPromptAddendum: string;
};

export type SubjectAdapter = {
  subject: SubjectKey;
  label: string;
  evaluationStyle: EvaluationStyle;
  tutoringWorkflow: TutoringWorkflow;
  remediationStyle: RemediationStyle;
  decay: DecayProfile;
  predictionWeights: PredictionWeights;
  semanticRules: SemanticReasoningRules;

  /**
   * Compute a subject-specific retention adjustment on top of the generic
   * memory-decay engine result. Pure function. Return delta in [-30, +30].
   */
  retentionAdjustment(input: {
    daysSincePractice: number;
    recentMistakes: number;
    confidence: number;
  }): number;

  /**
   * Tweak the readiness score produced by the shared board-readiness engine
   * using subject-specific weights. Returns the final score clamped 0..100.
   */
  finalizeReadiness(base: number, factors: PredictionWeights): number;
};

export function normalizeWeights(w: PredictionWeights): PredictionWeights {
  const sum =
    w.memory +
    w.reasoning +
    w.tutoringContinuity +
    w.weaknessSeverity +
    w.recentPerformance;
  if (sum <= 0) return w;
  return {
    memory: w.memory / sum,
    reasoning: w.reasoning / sum,
    tutoringContinuity: w.tutoringContinuity / sum,
    weaknessSeverity: w.weaknessSeverity / sum,
    recentPerformance: w.recentPerformance / sum,
  };
}

export function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}