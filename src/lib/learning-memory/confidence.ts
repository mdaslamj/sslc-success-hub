/**
 * Confidence engine — per-concept rolling confidence with EMA trend tracking
 * and chronic-weakness detection.
 */

import type { ConceptConfidenceDoc } from "@/integrations/firebase/types";

const EMA_ALPHA = 0.35;
const CHRONIC_CONFIDENCE = 35;
const CHRONIC_ATTEMPTS = 3;

export function conceptKeyFromLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "concept";
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function applyConfidenceDelta(
  existing: ConceptConfidenceDoc | null,
  input: {
    userId: string;
    conceptLabel: string;
    subjectId?: string;
    chapterId?: string;
    /** -100..+100. Positive = success on this concept, negative = struggle. */
    delta: number;
    success: boolean;
  },
): ConceptConfidenceDoc {
  const now = Date.now();
  const key = conceptKeyFromLabel(input.conceptLabel);
  if (!existing) {
    const confidence = clamp(50 + input.delta, 0, 100);
    const trend = clamp(input.delta / 100, -1, 1);
    return {
      id: key,
      userId: input.userId,
      conceptKey: key,
      conceptLabel: input.conceptLabel,
      subjectId: input.subjectId,
      chapterId: input.chapterId,
      confidence,
      trend,
      attempts: 1,
      successes: input.success ? 1 : 0,
      lastDelta: input.delta,
      lastSeenAt: now,
      chronicWeak: confidence < CHRONIC_CONFIDENCE && 1 >= CHRONIC_ATTEMPTS,
    };
  }
  const confidence = clamp(existing.confidence + input.delta, 0, 100);
  const normalizedDelta = clamp(input.delta / 100, -1, 1);
  const trend = clamp(
    EMA_ALPHA * normalizedDelta + (1 - EMA_ALPHA) * existing.trend,
    -1,
    1,
  );
  const attempts = existing.attempts + 1;
  const successes = existing.successes + (input.success ? 1 : 0);
  return {
    ...existing,
    confidence,
    trend,
    attempts,
    successes,
    lastDelta: input.delta,
    lastSeenAt: now,
    chronicWeak: confidence < CHRONIC_CONFIDENCE && attempts >= CHRONIC_ATTEMPTS,
  };
}

export type ConceptConfidenceSummary = {
  total: number;
  strong: ConceptConfidenceDoc[]; // confidence >= 70
  weak: ConceptConfidenceDoc[]; // confidence < 50
  chronic: ConceptConfidenceDoc[];
  improving: ConceptConfidenceDoc[]; // trend > 0.15
  regressing: ConceptConfidenceDoc[]; // trend < -0.15
};

export function summarizeConcepts(
  concepts: ConceptConfidenceDoc[],
): ConceptConfidenceSummary {
  const strong = concepts.filter((c) => c.confidence >= 70);
  const weak = concepts.filter((c) => c.confidence < 50);
  const chronic = concepts.filter((c) => c.chronicWeak);
  const improving = concepts.filter((c) => c.trend > 0.15);
  const regressing = concepts.filter((c) => c.trend < -0.15);
  return {
    total: concepts.length,
    strong,
    weak,
    chronic,
    improving,
    regressing,
  };
}