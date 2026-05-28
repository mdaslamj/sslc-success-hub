import { findChapterByKey, normalizeChapterKey } from "@/lib/normalizeChapterKey";

function getChapterStorage(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

export const loadManifest = async (subjectId?: string) => {
  // Backwards compatible: no subjectId (or "mathematics"/"math") loads the
  // legacy top-level manifest used by the math pipeline. Other subjects load
  // their per-subject manifest from public/content/chapters/{subjectId}/manifest.json.
  const isMath = !subjectId || subjectId === "mathematics" || subjectId === "math";
  const url = isMath
    ? "/content/manifest.json"
    : `/content/chapters/${subjectId}/manifest.json`;
  const res = await fetch(url);
  return res.json();
};

const CHAPTER_CACHE_VERSION = "v2";

function legacyChapterCacheKeys(
  subjectId: string,
  contentSlug: string,
  chapterId: string,
): string[] {
  return [
    ...new Set([
      `chapter_${subjectId}_${normalizeChapterKey(contentSlug)}`,
      `chapter_${subjectId}_${contentSlug}`,
      `chapter_${subjectId}_${chapterId}`,
      `chapter_${subjectId}_${normalizeChapterKey(chapterId)}`,
    ]),
  ];
}

function chapterCacheKeys(subjectId: string, contentSlug: string, chapterId: string): string[] {
  const slugKey = normalizeChapterKey(contentSlug);
  return [
    ...new Set([
      `${CHAPTER_CACHE_VERSION}_chapter_${subjectId}_${slugKey}`,
      ...legacyChapterCacheKeys(subjectId, contentSlug, chapterId),
    ]),
  ];
}

function chapterCacheWriteKey(subjectId: string, contentSlug: string): string {
  return `${CHAPTER_CACHE_VERSION}_chapter_${subjectId}_${normalizeChapterKey(contentSlug)}`;
}

/** Skip manifest stubs or stale caches missing MCQs and/or resources. */
function shouldRefetchCachedChapter(data: unknown): boolean {
  if (!data || typeof data !== "object") return true;
  const row = data as {
    resources?: unknown;
    mcqs?: unknown[];
    formulas?: unknown[];
    summary?: string;
  };

  const hasMcqs = Array.isArray(row.mcqs) && row.mcqs.length > 0;
  const hasResources = Array.isArray(row.resources) && row.resources.length > 0;
  const hasFormulas = Array.isArray(row.formulas) && row.formulas.length > 0;
  const hasRichSummary =
    typeof row.summary === "string" && row.summary.length > 120;

  // Complete chapter JSON — safe for exams and resources panels.
  if (hasMcqs && hasResources) return false;

  // Partial/stale cache — always refetch.
  if (hasMcqs || hasResources || hasFormulas || hasRichSummary) return true;

  return true;
}

function clearLegacyChapterCaches(
  subjectId: string,
  contentSlug: string,
  chapterId: string,
): void {
  const storage = getChapterStorage();
  if (!storage) return;
  for (const key of legacyChapterCacheKeys(subjectId, contentSlug, chapterId)) {
    storage.removeItem(key);
  }
}

async function resolveContentSlug(subjectId: string, chapterId: string): Promise<string> {
  const trimmed = chapterId.trim();
  if (/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/i.test(trimmed) && !/^math-ch\d+$/i.test(trimmed)) {
    return trimmed.replace(/_/g, "-").toLowerCase();
  }

  try {
    const manifest = (await loadManifest(subjectId)) as {
      chapters?: { id: string; title?: string }[];
    };
    const match = findChapterByKey(manifest.chapters ?? [], trimmed);
    if (match?.id) return match.id;
  } catch {
    // fall through
  }

  return trimmed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const loadChapter = async (subjectId: string, chapterId: string) => {
  const contentSlug = await resolveContentSlug(subjectId, chapterId);
  const storage = getChapterStorage();

  if (storage) {
    for (const cacheKey of chapterCacheKeys(subjectId, contentSlug, chapterId)) {
      const cached = storage.getItem(cacheKey);
      if (!cached) continue;
      try {
        const data = JSON.parse(cached);
        if (!shouldRefetchCachedChapter(data)) return data;
      } catch {
        storage.removeItem(cacheKey);
      }
    }
  }

  const res = await fetch(`/content/chapters/${subjectId}/${contentSlug}.json`);

  if (!res.ok) throw new Error(`Chapter not found: ${contentSlug}`);

  const data = await res.json();

  if (storage) {
    storage.setItem(chapterCacheWriteKey(subjectId, contentSlug), JSON.stringify(data));
    clearLegacyChapterCaches(subjectId, contentSlug, chapterId);
  }

  return data;
};
