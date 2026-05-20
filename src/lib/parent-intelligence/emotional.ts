/**
 * Emotional framing helpers. Wraps raw signals in supportive, constructive
 * language. Parents see encouragement first, action second — never fear,
 * never blame, never comparison.
 */

export type Tone = "celebration" | "supportive" | "gentle_nudge";

const OPENINGS: Record<Tone, string[]> = {
  celebration: [
    "Great news —",
    "Lovely progress —",
    "Something worth celebrating —",
  ],
  supportive: [
    "A small note —",
    "Quick gentle update —",
    "Here's something to know —",
  ],
  gentle_nudge: [
    "Something to be aware of —",
    "A soft heads-up —",
    "Worth a kind conversation —",
  ],
};

/** Deterministic pick so the same alert reads the same on every render. */
function pick<T>(arr: T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return arr[h % arr.length];
}

export function frameAlertTitle(tone: Tone, raw: string, seed: string): string {
  const opener = pick(OPENINGS[tone], seed);
  return `${opener} ${raw}`;
}

/** Strip fear-based phrasing — keep the prompt encouraging. */
export function softenPhrase(s: string): string {
  return s
    .replace(/\bfailing\b/gi, "still building confidence in")
    .replace(/\bweak\b/gi, "growing")
    .replace(/\bbehind\b/gi, "catching up on")
    .replace(/\bmust\b/gi, "could")
    .replace(/\bshould\b/gi, "might")
    .replace(/\bproblem\b/gi, "opportunity");
}

/** Constructive parent-action suggestion library. */
export const PARENT_SUGGESTIONS = {
  weakSubject: (subject: string) =>
    `Ask about one thing they learned in ${subject} today — curiosity beats correction.`,
  revisionOverdue: () =>
    "A 15-min calm space + their favourite snack often unblocks revision.",
  confidenceDecline: () =>
    "Acknowledge effort, not outcome. Small wins compound fast at this age.",
  improvement: () =>
    "Tell them you noticed — being seen is the best reward.",
  boardReadiness: () =>
    "Keep the focus on consistency, not the score. Daily reps are working.",
  lowStudyTime: () =>
    "Protect a fixed 30-min slot together — environment beats willpower.",
} as const;