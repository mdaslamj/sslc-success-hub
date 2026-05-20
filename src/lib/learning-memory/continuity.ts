/**
 * Tutoring continuity — composes a short grounding blurb the AI tutor can
 * weight against, plus user-facing snippets the UI surfaces as subtle
 * "Aura remembers..." reassurances.
 */

import type {
  ConceptConfidenceDoc,
  LearningProfileDoc,
  MistakeMemoryDoc,
  ScanHistoryDoc,
  TutoringPreferencesDoc,
} from "@/integrations/firebase/types";
import { summarizeConcepts } from "./confidence";

export type TutoringContext = {
  profile: LearningProfileDoc | null;
  preferences: TutoringPreferencesDoc | null;
  mistakes: MistakeMemoryDoc[];
  concepts: ConceptConfidenceDoc[];
  history: ScanHistoryDoc[];
};

/** Build a compact grounding string suitable for semantic-reasoning prompts. */
export function buildTutoringGrounding(ctx: TutoringContext): string {
  const parts: string[] = [];
  if (ctx.profile) {
    parts.push(
      `Learner: depth=${ctx.profile.explanationDepth}, pace=${ctx.profile.pace}, language=${ctx.profile.preferredLanguage}.`,
    );
  }
  if (ctx.preferences) {
    parts.push(
      `Tutor prefs: hint=${ctx.preferences.hintDepth}, tone=${ctx.preferences.toneFormality}${
        ctx.preferences.kannadaFriendly ? ", kannada-friendly" : ""
      }${ctx.preferences.preferStepByStep ? ", prefers step-by-step" : ""}.`,
    );
  }
  const repeated = ctx.mistakes
    .filter((m) => m.occurrences >= 2)
    .slice(0, 5)
    .map((m) => `${m.pattern}${m.chapterId ? `@${m.chapterId}` : ""}×${m.occurrences}`);
  if (repeated.length) parts.push(`Repeat mistakes: ${repeated.join("; ")}.`);

  const sum = summarizeConcepts(ctx.concepts);
  if (sum.chronic.length) {
    parts.push(
      `Chronic weak concepts: ${sum.chronic
        .slice(0, 5)
        .map((c) => c.conceptLabel)
        .join(", ")}.`,
    );
  }
  if (sum.improving.length) {
    parts.push(
      `Improving: ${sum.improving.slice(0, 3).map((c) => c.conceptLabel).join(", ")}.`,
    );
  }
  const recentChapters = Array.from(
    new Set(ctx.history.map((h) => h.chapterTitle).filter(Boolean)),
  ).slice(0, 5);
  if (recentChapters.length) {
    parts.push(`Recent scans: ${recentChapters.join("; ")}.`);
  }
  return parts.join(" ");
}

export type ContinuityHint = {
  tone: "remember" | "previous" | "encourage" | "alert";
  message: string;
};

/** Produce short UI strings rendered by AuraRemembers. Caller picks 1-2. */
export function buildContinuityHints(
  ctx: TutoringContext,
  opts?: { chapterId?: string; conceptLabels?: string[] },
): ContinuityHint[] {
  const out: ContinuityHint[] = [];
  const wantedConcepts = (opts?.conceptLabels ?? []).map((c) => c.toLowerCase());

  // 1. Chronic / repeat mistake match
  const repeatedHere = ctx.mistakes.find(
    (m) =>
      m.occurrences >= 2 &&
      (!opts?.chapterId || m.chapterId === opts.chapterId),
  );
  if (repeatedHere) {
    out.push({
      tone: "remember",
      message: `Aura remembers — you've hit ${labelPattern(repeatedHere.pattern)} ${repeatedHere.occurrences} times here.`,
    });
  }

  // 2. Previous scans on same chapter
  const previous = ctx.history.filter(
    (h) => opts?.chapterId && h.chapterId === opts.chapterId,
  );
  if (previous.length >= 1) {
    out.push({
      tone: "previous",
      message: `Based on your previous ${previous.length} scan${previous.length === 1 ? "" : "s"} in this chapter, I'll lean on step-by-step.`,
    });
  }

  // 3. Concept-level callouts
  const sum = summarizeConcepts(ctx.concepts);
  const weakMatch = sum.weak.find((c) =>
    wantedConcepts.some((w) => c.conceptLabel.toLowerCase().includes(w)),
  );
  if (weakMatch) {
    out.push({
      tone: "alert",
      message: `${weakMatch.conceptLabel} is still a soft spot — slowing down here.`,
    });
  }
  const improvingMatch = sum.improving.find((c) =>
    wantedConcepts.some((w) => c.conceptLabel.toLowerCase().includes(w)),
  );
  if (improvingMatch) {
    out.push({
      tone: "encourage",
      message: `Nice — your confidence on ${improvingMatch.conceptLabel} is climbing.`,
    });
  }
  return out.slice(0, 2);
}

function labelPattern(p: MistakeMemoryDoc["pattern"]): string {
  switch (p) {
    case "sign_error":
      return "sign errors";
    case "formula_misuse":
      return "formula misuse";
    case "skipped_step":
      return "skipped steps";
    case "conceptual_confusion":
      return "conceptual confusion";
    case "presentation_weak":
      return "presentation slips";
    case "calculation":
      return "calculation slips";
    case "unit_error":
      return "unit mistakes";
    default:
      return "this mistake";
  }
}