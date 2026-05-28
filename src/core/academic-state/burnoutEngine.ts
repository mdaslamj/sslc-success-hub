import type { BurnoutOutput } from "@/types/aura-engine-contracts";

export type BurnoutSnapshot = {
  risk: string;
  score: number;
  recommendation: string;
};

/** Thin adapter over pipeline burnout — future: dedicated burnoutEngine. */
export function computeBurnoutSnapshot(burnout: BurnoutOutput): BurnoutSnapshot {
  return {
    risk: burnout.risk,
    score: burnout.score,
    recommendation: burnout.recommendation,
  };
}
