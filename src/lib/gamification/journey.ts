/**
 * Board readiness journey: beginner → consistent learner → board fighter →
 * SSLC master. Tier is derived from total XP + active streak so it tracks
 * sustained habit rather than burst activity.
 */
import type { JourneyTier } from "@/integrations/firebase/types";

export type JourneyTierDef = {
  id: JourneyTier;
  label: string;
  shortLabel: string;
  minXp: number;
  minStreak: number;
  emoji: string;
  description: string;
};

export const JOURNEY_TIERS: JourneyTierDef[] = [
  {
    id: "beginner",
    label: "Beginner",
    shortLabel: "Beginner",
    minXp: 0,
    minStreak: 0,
    emoji: "🌱",
    description: "Every expert started right where you are.",
  },
  {
    id: "consistent_learner",
    label: "Consistent Learner",
    shortLabel: "Consistent",
    minXp: 1200,
    minStreak: 3,
    emoji: "🌿",
    description: "Showing up daily is the real magic.",
  },
  {
    id: "board_fighter",
    label: "Board Fighter",
    shortLabel: "Fighter",
    minXp: 5000,
    minStreak: 10,
    emoji: "🔥",
    description: "Weak topics are getting weaker every week.",
  },
  {
    id: "sslc_master",
    label: "SSLC Master",
    shortLabel: "Master",
    minXp: 14000,
    minStreak: 21,
    emoji: "👑",
    description: "You're board-ready and it shows.",
  },
];

export function computeJourneyTier(totalXp: number, currentStreak: number): JourneyTierDef {
  let active = JOURNEY_TIERS[0];
  for (const t of JOURNEY_TIERS) {
    if (totalXp >= t.minXp && currentStreak >= t.minStreak) active = t;
  }
  return active;
}

export function nextJourneyTier(current: JourneyTier): JourneyTierDef | null {
  const idx = JOURNEY_TIERS.findIndex((t) => t.id === current);
  return idx >= 0 && idx < JOURNEY_TIERS.length - 1 ? JOURNEY_TIERS[idx + 1] : null;
}

/** 0..1 progress toward the next tier — used for the strip progress bar. */
export function journeyProgress(totalXp: number, currentStreak: number): number {
  const tier = computeJourneyTier(totalXp, currentStreak);
  const next = nextJourneyTier(tier.id);
  if (!next) return 1;
  const xpRange = Math.max(1, next.minXp - tier.minXp);
  const xpPct = (totalXp - tier.minXp) / xpRange;
  const streakRange = Math.max(1, next.minStreak - tier.minStreak);
  const streakPct = (currentStreak - tier.minStreak) / streakRange;
  // Tier requires BOTH — show the lagging dimension.
  return Math.max(0, Math.min(1, Math.min(xpPct, streakPct)));
}