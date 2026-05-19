import { SEMANTIC_GUARDRAIL } from "@/lib/semantic-reasoning/prompts";
import { getSubjectAdapter } from "./registry";
import { clamp, normalizeWeights } from "./types";
import type { PredictionWeights } from "./types";

/**
 * Apply a subject adapter's prediction weights + finalize step on top of
 * the generic readiness factor map produced by the board-readiness engine.
 *
 * The shared engine still runs; the adapter only re-weights and finalizes,
 * so the planner/prediction backbone stays single-sourced.
 */
export function applyAdapterToReadiness(
  subjectId: string | undefined,
  factors: {
    memory: number; // 0..100
    reasoning: number;
    tutoringContinuity: number;
    weaknessSeverity: number; // inverted: higher = worse; expect already-normalised score 0..100
    recentPerformance: number;
  },
): number {
  const adapter = getSubjectAdapter(subjectId);
  const w = normalizeWeights(adapter.predictionWeights);
  const base =
    factors.memory * w.memory +
    factors.reasoning * w.reasoning +
    factors.tutoringContinuity * w.tutoringContinuity +
    factors.weaknessSeverity * w.weaknessSeverity +
    factors.recentPerformance * w.recentPerformance;
  return adapter.finalizeReadiness(clamp(base), w as PredictionWeights);
}

/**
 * Wrap the generic retention score with the subject adapter's adjustment.
 * Generic engine output goes in; subject-tuned score (0..100) comes out.
 */
export function adaptedRetentionScore(
  subjectId: string | undefined,
  base: number,
  input: {
    daysSincePractice: number;
    recentMistakes: number;
    confidence: number;
  },
): number {
  const adapter = getSubjectAdapter(subjectId);
  const delta = adapter.retentionAdjustment(input);
  return clamp(base + delta);
}

/**
 * Build the system-prompt fragment that the semantic reasoning layer should
 * use for a given subject. Kept side-effect free so it can be composed into
 * any of the existing prompt builders without duplicating the guardrail.
 */
export function adapterSystemPromptFor(subjectId: string | undefined): string {
  const adapter = getSubjectAdapter(subjectId);
  const rules = adapter.semanticRules;
  const toggles = [
    rules.allowAlternateMethods ? "allow-alternate-methods" : "single-canonical-method",
    rules.requireStepShown ? "require-steps" : "steps-optional",
    rules.weighsDiagrams ? "weighs-diagrams" : null,
    rules.weighsChronology ? "weighs-chronology" : null,
    rules.gatesOnGrammar ? "grammar-gates-fluency" : null,
  ]
    .filter(Boolean)
    .join(", ");
  return `${SEMANTIC_GUARDRAIL}\n\nSubject: ${adapter.label} (${adapter.evaluationStyle}); rules: ${toggles}.\n${rules.systemPromptAddendum}`;
}