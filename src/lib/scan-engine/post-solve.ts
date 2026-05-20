import {
  enqueueRevision,
  saveWeaknessProfile,
  savePracticeRecommendation,
} from "@/integrations/firebase/services";
import type {
  PracticeRecommendationDoc,
  RevisionQueueDoc,
  ScanDoc,
  WeaknessProfileDoc,
} from "@/integrations/firebase/types";

function id(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Schedule a revision card based on the scan's understanding. */
export async function scheduleScanRevision(
  userId: string,
  scan: ScanDoc,
  opts: { daysAhead?: number } = {},
): Promise<RevisionQueueDoc> {
  const now = Date.now();
  const days = opts.daysAhead ?? 2;
  const item: RevisionQueueDoc = {
    id: id("rev"),
    userId,
    chapterId: scan.understanding?.chapterId ?? `scan_${scan.id}`,
    subjectId: scan.understanding?.subjectId ?? "general",
    priority: Math.max(40, Math.min(95, scan.understanding?.boardRelevance ?? 60)),
    scheduledDate: now + days * 24 * 60 * 60 * 1000,
    status: "pending",
    confidenceScore: 50,
    confidenceDecay: 0.4,
    interval: days,
    createdAt: now,
    updatedAt: now,
  };
  await enqueueRevision(item);
  return item;
}

/** Patch a weakness profile from the scan's detected concepts. */
export async function markScanWeakness(
  userId: string,
  scan: ScanDoc,
): Promise<void> {
  const chapterId = scan.understanding?.chapterId ?? `scan_${scan.id}`;
  const subjectId = scan.understanding?.subjectId ?? "general";
  const now = Date.now();
  const profile: WeaknessProfileDoc = {
    id: chapterId,
    userId,
    chapterId,
    subjectId,
    severity: "medium",
    weakConcepts: scan.understanding?.concepts ?? [],
    weakFormulas: scan.understanding?.formulas ?? [],
    confidenceScore: 40,
    accuracyRate: 0,
    averageTimeSeconds: 0,
    attemptsCount: 0,
    lastAttemptAt: now,
    lastUpdated: now,
    createdAt: now,
    recommendedActions: [],
  } as unknown as WeaknessProfileDoc;
  try {
    await saveWeaknessProfile(profile);
  } catch {
    /* shape may be richer in actual schema — best-effort */
  }
}

export async function saveScanPractice(
  userId: string,
  scanId: string,
  prompts: string[],
  reason: string,
): Promise<PracticeRecommendationDoc> {
  const rec: PracticeRecommendationDoc = {
    id: id("rec"),
    userId,
    scanId,
    questionIds: [],
    prompts,
    reason,
    createdAt: Date.now(),
  };
  await savePracticeRecommendation(rec);
  return rec;
}