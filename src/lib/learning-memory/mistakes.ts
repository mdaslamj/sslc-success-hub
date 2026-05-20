/**
 * Mistake intelligence — lightweight pattern detection over scanned question
 * text + AI solutions. Heuristic-only so it runs client-side without extra
 * AI calls; the semantic-reasoning layer can later refine these labels.
 */

import type {
  MistakeMemoryDoc,
  MistakePattern,
} from "@/integrations/firebase/types";

type Rule = {
  pattern: MistakePattern;
  /** Lower-cased substrings; ANY match flags the pattern. */
  triggers: string[];
  /** Aura-voice note shown back to the student. */
  note: string;
};

const RULES: Rule[] = [
  {
    pattern: "sign_error",
    triggers: ["sign error", "negative sign", "missed minus", "wrong sign", "−ve", "-ve "],
    note: "Watch the sign of every term — drop one and the whole answer flips.",
  },
  {
    pattern: "formula_misuse",
    triggers: [
      "wrong formula",
      "incorrect formula",
      "formula does not apply",
      "should use",
      "applied incorrectly",
    ],
    note: "Re-check the formula's conditions before plugging values in.",
  },
  {
    pattern: "skipped_step",
    triggers: ["skipped", "missing step", "jumped to", "without showing", "no working"],
    note: "Board examiners want every step — even the obvious algebra.",
  },
  {
    pattern: "conceptual_confusion",
    triggers: [
      "confused",
      "misconception",
      "doesn't understand",
      "doesn’t understand",
      "misunderstood",
      "concept is",
    ],
    note: "We'll come back to this concept with a slower walkthrough.",
  },
  {
    pattern: "presentation_weak",
    triggers: ["messy", "unclear handwriting", "not labelled", "no diagram", "untidy"],
    note: "Label diagrams and underline the final answer for full marks.",
  },
  {
    pattern: "calculation",
    triggers: ["calculation error", "arithmetic", "computation mistake", "miscalculated"],
    note: "Recompute key arithmetic steps on a side margin to catch slips.",
  },
  {
    pattern: "unit_error",
    triggers: ["unit", "missing unit", "wrong unit", "dimensional"],
    note: "Always carry units through every step and into the final answer.",
  },
];

export type DetectedMistakeHit = {
  pattern: MistakePattern;
  note: string;
  matched: string[];
};

/** Scan one or more free-text blobs for known mistake patterns. */
export function detectMistakePatterns(...blobs: (string | undefined)[]): DetectedMistakeHit[] {
  const haystack = blobs.filter(Boolean).join("\n").toLowerCase();
  if (!haystack) return [];
  const hits: DetectedMistakeHit[] = [];
  for (const rule of RULES) {
    const matched = rule.triggers.filter((t) => haystack.includes(t));
    if (matched.length > 0) {
      hits.push({ pattern: rule.pattern, note: rule.note, matched });
    }
  }
  return hits;
}

/** Deterministic mistake doc id, scoped per chapter/concept so repeats merge. */
export function mistakeId(
  pattern: MistakePattern,
  scope: { chapterId?: string; conceptKey?: string },
): string {
  const tail = scope.chapterId ?? scope.conceptKey ?? "global";
  return `${pattern}__${tail}`;
}

/** Merge a new occurrence into an existing mistake memory doc (or create one). */
export function mergeMistake(
  existing: MistakeMemoryDoc | null,
  input: {
    userId: string;
    pattern: MistakePattern;
    note: string;
    scanId: string;
    subjectId?: string;
    chapterId?: string;
    conceptKey?: string;
  },
): MistakeMemoryDoc {
  const now = Date.now();
  if (!existing) {
    return {
      id: mistakeId(input.pattern, {
        chapterId: input.chapterId,
        conceptKey: input.conceptKey,
      }),
      userId: input.userId,
      pattern: input.pattern,
      subjectId: input.subjectId,
      chapterId: input.chapterId,
      conceptKey: input.conceptKey,
      occurrences: 1,
      scanIds: [input.scanId],
      note: input.note,
      firstSeenAt: now,
      lastSeenAt: now,
    };
  }
  const scanIds = Array.from(new Set([input.scanId, ...existing.scanIds])).slice(0, 20);
  return {
    ...existing,
    occurrences: existing.occurrences + 1,
    scanIds,
    note: input.note || existing.note,
    lastSeenAt: now,
  };
}