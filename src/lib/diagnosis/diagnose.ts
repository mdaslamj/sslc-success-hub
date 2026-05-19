import type {
  ChapterDoc,
  PerformanceRecordDoc,
  RepeatedMistakeKey,
  RepeatedMistakeStats,
  WeaknessLayer,
  WeaknessProfileDoc,
} from "@/integrations/firebase/types";

const ZERO_LAYERS: Record<WeaknessLayer, number> = {
  conceptual: 0,
  procedural: 0,
  computational: 0,
  presentation: 0,
  behavioural: 0,
};

const ZERO_MISTAKES: RepeatedMistakeStats = {
  signError: 0,
  skippedSteps: 0,
  formulaMisuse: 0,
  calculationMistake: 0,
  weakIdentity: 0,
};

export function emptyWeaknessProfile(
  userId: string,
  subjectId: string,
  chapterId: string,
): WeaknessProfileDoc {
  return {
    id: chapterId,
    userId,
    chapterId,
    subjectId,
    weaknessLayers: { ...ZERO_LAYERS },
    repeatedMistakes: { ...ZERO_MISTAKES },
    confidenceScore: 0,
    masteryTrend: [],
    marksAtRisk: 0,
    weakConcepts: [],
    lastUpdated: Date.now(),
  };
}

/** Per-record-type contribution weight when aggregating mastery. */
const TYPE_WEIGHTS = {
  quiz: 1,
  mock: 1.5,
  ocr: 1.2,
  rubric: 1.4,
  formula: 0.8,
  speed: 0.6,
} as const;

/**
 * Map a single record into weakness-layer deltas. The mapping is
 * deliberately conservative; the engine averages many records so single
 * outliers do not dominate.
 */
function layerDeltasFromRecord(
  r: PerformanceRecordDoc,
): Partial<Record<WeaknessLayer, number>> {
  const gap = Math.max(0, 100 - r.score);
  switch (r.type) {
    case "quiz":
    case "mock":
      return { conceptual: gap * 0.5, procedural: gap * 0.3, behavioural: gap * 0.2 };
    case "ocr":
      return { presentation: gap * 0.6, procedural: gap * 0.4 };
    case "rubric":
      return { procedural: gap * 0.5, presentation: gap * 0.3, conceptual: gap * 0.2 };
    case "formula":
      return { conceptual: gap * 0.4, computational: gap * 0.4, procedural: gap * 0.2 };
    case "speed":
      return { behavioural: gap * 0.6, procedural: gap * 0.4 };
    default:
      return {};
  }
}

function detectRepeatedMistakes(
  r: PerformanceRecordDoc,
): Partial<RepeatedMistakeStats> {
  const meta = r.metadata ?? {};
  const hits: Partial<RepeatedMistakeStats> = {};
  for (const key of Object.keys(ZERO_MISTAKES) as RepeatedMistakeKey[]) {
    const v = meta[key];
    if (typeof v === "number" && v > 0) hits[key] = v;
    else if (v === true) hits[key] = 1;
  }
  return hits;
}

function mergeLayers(
  acc: Record<WeaknessLayer, { sum: number; weight: number }>,
  deltas: Partial<Record<WeaknessLayer, number>>,
  weight: number,
) {
  for (const [k, v] of Object.entries(deltas)) {
    const key = k as WeaknessLayer;
    acc[key].sum += (v ?? 0) * weight;
    acc[key].weight += weight;
  }
}

export type DiagnosisInput = {
  userId: string;
  subjectId: string;
  chapter: Pick<ChapterDoc, "id"> & { totalBoardMarks?: number };
  records: PerformanceRecordDoc[];
  previous?: WeaknessProfileDoc | null;
};

/**
 * Re-compute the per-chapter weakness profile from the full record stream.
 * Idempotent and pure — callers persist the returned profile.
 */
export function diagnoseWeakness(input: DiagnosisInput): WeaknessProfileDoc {
  const { userId, subjectId, chapter, records } = input;
  const totalBoardMarks = chapter.totalBoardMarks ?? 10;

  const layerAcc: Record<WeaknessLayer, { sum: number; weight: number }> = {
    conceptual: { sum: 0, weight: 0 },
    procedural: { sum: 0, weight: 0 },
    computational: { sum: 0, weight: 0 },
    presentation: { sum: 0, weight: 0 },
    behavioural: { sum: 0, weight: 0 },
  };

  const mistakes: RepeatedMistakeStats = { ...ZERO_MISTAKES };
  const weakConcepts = new Set<string>();
  let weightedScoreSum = 0;
  let weightSum = 0;

  // Sort ascending for trend reconstruction.
  const sorted = [...records].sort((a, b) => a.createdAt - b.createdAt);

  for (const r of sorted) {
    const w = TYPE_WEIGHTS[r.type] ?? 1;
    mergeLayers(layerAcc, layerDeltasFromRecord(r), w);

    const hits = detectRepeatedMistakes(r);
    for (const [k, v] of Object.entries(hits)) {
      mistakes[k as RepeatedMistakeKey] += v ?? 0;
    }

    if (typeof r.metadata?.weakConcept === "string") {
      weakConcepts.add(r.metadata.weakConcept);
    }

    weightedScoreSum += r.score * w;
    weightSum += w;
  }

  const weaknessLayers: Record<WeaknessLayer, number> = { ...ZERO_LAYERS };
  for (const k of Object.keys(layerAcc) as WeaknessLayer[]) {
    const { sum, weight } = layerAcc[k];
    weaknessLayers[k] = weight > 0 ? +(sum / weight).toFixed(1) : 0;
  }

  const confidenceScore =
    weightSum > 0 ? +(weightedScoreSum / weightSum).toFixed(1) : 0;

  // Mastery trend — bucket by day, keep last 14 buckets.
  const trendMap = new Map<number, { sum: number; count: number }>();
  const DAY = 24 * 60 * 60 * 1000;
  for (const r of sorted) {
    const bucket = Math.floor(r.createdAt / DAY) * DAY;
    const cur = trendMap.get(bucket) ?? { sum: 0, count: 0 };
    trendMap.set(bucket, { sum: cur.sum + r.score, count: cur.count + 1 });
  }
  const masteryTrend = Array.from(trendMap.entries())
    .sort(([a], [b]) => a - b)
    .slice(-14)
    .map(([at, { sum, count }]) => ({ at, mastery: +(sum / count).toFixed(1) }));

  const marksAtRisk = +(
    (Math.max(0, 100 - confidenceScore) / 100) *
    totalBoardMarks
  ).toFixed(1);

  return {
    id: chapter.id,
    userId,
    chapterId: chapter.id,
    subjectId,
    weaknessLayers,
    repeatedMistakes: mistakes,
    confidenceScore,
    masteryTrend,
    marksAtRisk,
    weakConcepts: Array.from(weakConcepts).slice(0, 12),
    lastUpdated: Date.now(),
  };
}

/** Convenience — identify the dominant weakness layer in a profile. */
export function topWeaknessLayer(p: WeaknessProfileDoc): WeaknessLayer {
  const entries = Object.entries(p.weaknessLayers) as [WeaknessLayer, number][];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] ?? "conceptual";
}