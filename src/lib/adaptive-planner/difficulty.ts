import type { DifficultyLevel, WeaknessProfileDoc } from "@/integrations/firebase/types";

/**
 * Confidence-based difficulty selection. Pure.
 *   < 45  → easier  (recovery practice)
 *   45-75 → medium  (targeted practice)
 *   > 75  → board   (board-level practice)
 */
export function selectDifficulty(confidence: number): DifficultyLevel {
  if (confidence < 45) return "easier";
  if (confidence < 75) return "medium";
  return "board";
}

/** Promote difficulty by one step (used after a successful session). */
export function nextDifficulty(d: DifficultyLevel): DifficultyLevel {
  if (d === "easier") return "medium";
  if (d === "medium") return "board";
  return "board";
}

/** Drop difficulty by one step (used after a failed session). */
export function previousDifficulty(d: DifficultyLevel): DifficultyLevel {
  if (d === "board") return "medium";
  if (d === "medium") return "easier";
  return "easier";
}

export function difficultyForProfile(p: WeaknessProfileDoc): DifficultyLevel {
  return selectDifficulty(p.confidenceScore);
}