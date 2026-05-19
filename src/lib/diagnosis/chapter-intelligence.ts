import type {
  ChapterIntelligenceDoc,
  WeaknessProfileDoc,
} from "@/integrations/firebase/types";

/**
 * Aggregate a cohort of per-user weakness profiles into a single
 * chapter-level intelligence summary. Pure — admin/cron caller persists.
 */
export function aggregateChapterIntelligence(args: {
  chapterId: string;
  subjectId: string;
  profiles: WeaknessProfileDoc[];
  highRiskThreshold?: number;
}): ChapterIntelligenceDoc {
  const { chapterId, subjectId, profiles } = args;
  const threshold = args.highRiskThreshold ?? 3;

  const conceptCounts = new Map<string, number>();
  for (const p of profiles) {
    for (const c of p.weakConcepts) {
      conceptCounts.set(c, (conceptCounts.get(c) ?? 0) + 1);
    }
  }
  const weakConcepts = [...conceptCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([c]) => c);

  const confidenceScore =
    profiles.length > 0
      ? +(
          profiles.reduce((s, p) => s + p.confidenceScore, 0) / profiles.length
        ).toFixed(1)
      : 0;

  // Average mastery per day bucket across cohort.
  const trendAcc = new Map<number, { sum: number; count: number }>();
  for (const p of profiles) {
    for (const pt of p.masteryTrend) {
      const cur = trendAcc.get(pt.at) ?? { sum: 0, count: 0 };
      trendAcc.set(pt.at, { sum: cur.sum + pt.mastery, count: cur.count + 1 });
    }
  }
  const masteryTrends = [...trendAcc.entries()]
    .sort(([a], [b]) => a - b)
    .slice(-30)
    .map(([at, { sum, count }]) => ({
      at,
      mastery: +(sum / count).toFixed(1),
    }));

  const totalStudents = profiles.length;
  const highRiskStudents = profiles.filter(
    (p) => p.marksAtRisk >= threshold,
  ).length;
  const averageMarksAtRisk =
    totalStudents > 0
      ? +(
          profiles.reduce((s, p) => s + p.marksAtRisk, 0) / totalStudents
        ).toFixed(2)
      : 0;

  return {
    id: "summary",
    chapterId,
    subjectId,
    weakConcepts,
    confidenceScore,
    masteryTrends,
    marksAtRiskAnalysis: {
      averageMarksAtRisk,
      highRiskStudents,
      totalStudents,
    },
    updatedAt: Date.now(),
  };
}