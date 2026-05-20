/**
 * Recovery reward engine — celebrates *improvement* rather than absolute
 * performance. Designed to avoid topper-only reward patterns: rewards
 * trigger when a previously-weak concept shows a positive confidence trend.
 */
import type { ConceptConfidenceDoc } from "@/integrations/firebase/types";

export type RecoveryReward = {
  conceptKey: string;
  conceptLabel: string;
  subjectId?: string;
  /** Confidence improvement in points (0..100). */
  delta: number;
  /** Suggested XP — feed into computeXpGrant({ source: "weak_recovery" }). */
  xp: number;
  reason: string;
};

/**
 * Scan concept confidences for recoveries:
 *  - previously chronicWeak OR confidence < 50
 *  - trend > 0.15 AND latest delta > 5
 */
export function detectRecoveryRewards(
  concepts: ConceptConfidenceDoc[],
): RecoveryReward[] {
  const out: RecoveryReward[] = [];
  for (const c of concepts) {
    const wasWeak = c.chronicWeak || c.confidence - c.lastDelta < 50;
    const trending = c.trend > 0.15 && c.lastDelta > 5;
    if (!wasWeak || !trending) continue;
    const delta = Math.min(40, Math.max(5, Math.round(c.lastDelta)));
    out.push({
      conceptKey: c.conceptKey,
      conceptLabel: c.conceptLabel,
      subjectId: c.subjectId,
      delta,
      xp: 35 + Math.round(delta * 1.2),
      reason:
        c.chronicWeak
          ? `Chronic weak topic improving — +${delta} confidence`
          : `Confidence climbing in ${c.conceptLabel}`,
    });
  }
  return out;
}