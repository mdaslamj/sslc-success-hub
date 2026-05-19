import type { MathChapterAnalyticsDoc } from "@/integrations/firebase/types";

export type SpeedBucket = "fast" | "on_pace" | "slow" | "very_slow";

export function classifySpeed(speedIndex: number): SpeedBucket {
  if (speedIndex < 0.8) return "fast";
  if (speedIndex < 1.15) return "on_pace";
  if (speedIndex < 1.5) return "slow";
  return "very_slow";
}

/** Rank chapters by speed (slowest first). */
export function rankBySpeed(
  analytics: MathChapterAnalyticsDoc[],
): { chapterId: string; speedIndex: number; bucket: SpeedBucket }[] {
  return analytics
    .map((a) => ({
      chapterId: a.chapterId,
      speedIndex: a.speedIndex,
      bucket: classifySpeed(a.speedIndex),
    }))
    .sort((a, b) => b.speedIndex - a.speedIndex);
}