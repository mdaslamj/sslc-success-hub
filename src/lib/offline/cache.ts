/**
 * Downloadable chapter packs. Stores chapters + formulas + notes + quizzes
 * + revision/planner tasks locally so a student can keep studying without
 * a connection. Each pack is namespaced by chapter id.
 */
import { offlineGet, offlineSet, offlineDelete } from "./storage";

export interface ChapterPack {
  chapterId: string;
  subjectId?: string;
  title: string;
  downloadedAt: number;
  sizeKb: number;
  resources: {
    formulas?: unknown[];
    notes?: unknown[];
    quizzes?: unknown[];
    revisionTasks?: unknown[];
    plannerTasks?: unknown[];
  };
}

const INDEX_KEY = "chapter-packs:index";

function packKey(chapterId: string): string {
  return `chapter-pack:${chapterId}`;
}

export async function listPacks(): Promise<ChapterPack[]> {
  return (await offlineGet<ChapterPack[]>(INDEX_KEY)) ?? [];
}

export async function getPack(chapterId: string): Promise<ChapterPack | null> {
  return offlineGet<ChapterPack>(packKey(chapterId));
}

export async function savePack(pack: ChapterPack): Promise<void> {
  await offlineSet(packKey(pack.chapterId), pack);
  const index = await listPacks();
  const without = index.filter((p) => p.chapterId !== pack.chapterId);
  // Index entries are lightweight summaries; do not copy full resources.
  without.push({ ...pack, resources: {} });
  await offlineSet(INDEX_KEY, without);
}

export async function deletePack(chapterId: string): Promise<void> {
  await offlineDelete(packKey(chapterId));
  const index = await listPacks();
  await offlineSet(
    INDEX_KEY,
    index.filter((p) => p.chapterId !== chapterId),
  );
}

export function estimatePackSize(pack: Omit<ChapterPack, "sizeKb">): number {
  try {
    return Math.max(1, Math.round(JSON.stringify(pack).length / 1024));
  } catch {
    return 1;
  }
}