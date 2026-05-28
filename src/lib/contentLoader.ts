import { findChapterByKey, normalizeChapterKey } from "@/lib/normalizeChapterKey";

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

function chapterCacheKeys(subjectId: string, contentSlug: string, chapterId: string): string[] {
  return [
    ...new Set([
      `chapter_${subjectId}_${normalizeChapterKey(contentSlug)}`,
      `chapter_${subjectId}_${contentSlug}`,
      `chapter_${subjectId}_${chapterId}`,
      `chapter_${subjectId}_${normalizeChapterKey(chapterId)}`,
    ]),
  ];
}

/** Skip manifest stubs or pre-resources caches that omit chapter JSON fields. */
function shouldRefetchCachedChapter(data: unknown): boolean {
  if (!data || typeof data !== "object") return true;
  const row = data as {
    resources?: unknown;
    mcqs?: unknown[];
    formulas?: unknown[];
    summary?: string;
  };
  const hasResources = Array.isArray(row.resources) && row.resources.length > 0;
  if (hasResources) return false;

  const hasMcqs = Array.isArray(row.mcqs) && row.mcqs.length > 0;
  const hasFormulas = Array.isArray(row.formulas) && row.formulas.length > 0;
  const hasRichSummary =
    typeof row.summary === "string" && row.summary.length > 120;

  // Partial caches (mcqs/formulas loaded) but resources key never fetched.
  if ((hasMcqs || hasFormulas || hasRichSummary) && !("resources" in row)) {
    return true;
  }

  if (hasMcqs || hasFormulas || hasRichSummary) return false;
  return true;
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

  for (const cacheKey of chapterCacheKeys(subjectId, contentSlug, chapterId)) {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) continue;
    try {
      const data = JSON.parse(cached);
      if (!shouldRefetchCachedChapter(data)) return data;
    } catch {
      localStorage.removeItem(cacheKey);
    }
  }

  const res = await fetch(`/content/chapters/${subjectId}/${contentSlug}.json`);

  if (!res.ok) throw new Error(`Chapter not found: ${contentSlug}`);

  const data = await res.json();

  localStorage.setItem(
    `chapter_${subjectId}_${normalizeChapterKey(contentSlug)}`,
    JSON.stringify(data),
  );

  return data;
};
