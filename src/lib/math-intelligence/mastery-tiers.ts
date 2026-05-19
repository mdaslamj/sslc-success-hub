/**
 * Mastery tiers — pure presentational mapping from mastery % to a named
 * tier used in the chapter hub header and chapter list.
 */

export type MasteryTier = {
  key: "novice" | "learner" | "practitioner" | "proficient" | "mastered";
  label: string;
  min: number; // inclusive
  max: number; // exclusive (except 100 which is inclusive at "mastered")
  /** Tailwind text color token. */
  tone: string;
  /** Tailwind bg color token (for the tier badge). */
  bg: string;
};

const TIERS: MasteryTier[] = [
  { key: "novice", label: "Novice", min: 0, max: 20, tone: "text-muted-foreground", bg: "bg-muted" },
  { key: "learner", label: "Learner", min: 20, max: 40, tone: "text-destructive", bg: "bg-destructive/15" },
  { key: "practitioner", label: "Practitioner", min: 40, max: 60, tone: "text-warning", bg: "bg-warning/15" },
  { key: "proficient", label: "Proficient", min: 60, max: 80, tone: "text-info", bg: "bg-info/15" },
  { key: "mastered", label: "Mastered", min: 80, max: 101, tone: "text-success", bg: "bg-success/15" },
];

export function tierFor(mastery: number): MasteryTier {
  const m = Math.max(0, Math.min(100, mastery));
  return TIERS.find((t) => m >= t.min && m < t.max) ?? TIERS[TIERS.length - 1];
}

export const MASTERY_TIERS = TIERS;
