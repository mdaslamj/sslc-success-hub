/**
 * Smart AI fallback — deterministic, lightweight tutoring used when the
 * network or the AI gateway is unavailable. Pulls from cached hints,
 * formula heuristics, and revision nudges. Never throws.
 */

export interface FallbackHint {
  title: string;
  body: string;
  source: "cache" | "formula" | "revision" | "generic";
}

const GENERIC_HINTS: FallbackHint[] = [
  {
    title: "Re-read the question",
    body: "Underline what is given and what is asked. Most board questions hide the method in the wording.",
    source: "generic",
  },
  {
    title: "Recall the related formula",
    body: "Write the formula first, then substitute. This earns method marks even if the answer is wrong.",
    source: "formula",
  },
  {
    title: "Try a similar solved example",
    body: "Open the chapter pack you downloaded and find a worked example with the same pattern.",
    source: "revision",
  },
];

export function getOfflineHint(topic?: string, cachedHints: FallbackHint[] = []): FallbackHint {
  const pool = [...cachedHints, ...GENERIC_HINTS];
  if (topic) {
    const match = pool.find((h) => h.body.toLowerCase().includes(topic.toLowerCase()));
    if (match) return match;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

export function formulaGuidance(formula: string): string {
  return `Offline tip — write "${formula}" first, label each variable from the question, then substitute. Method marks come from showing the formula, not just the final number.`;
}

export function revisionNudge(weakTopic?: string): string {
  if (!weakTopic) {
    return "Spend 10 minutes on yesterday's mistakes before opening anything new.";
  }
  return `Aura suggests a quick 10-minute revision of ${weakTopic} — it's been your softest area lately.`;
}