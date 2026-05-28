/**
 * Canonical chapter key for cross-source lookups (manifest id, title,
 * Firestore doc id, blueprint id, URL slug variants).
 */
export function normalizeChapterKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function chapterKeysMatch(a: string, b: string): boolean {
  return normalizeChapterKey(a) === normalizeChapterKey(b);
}

type ChapterKeyEntry = {
  id: string;
  title?: string;
  chapterNumber?: number;
};

/** Find a chapter entry when ids/titles may use different slug formats. */
export function findChapterByKey<T extends ChapterKeyEntry>(
  chapters: T[],
  key: string,
): T | undefined {
  const normalized = normalizeChapterKey(key);
  if (!normalized) return undefined;

  return chapters.find(
    (c) =>
      normalizeChapterKey(c.id) === normalized ||
      (c.title != null && normalizeChapterKey(c.title) === normalized),
  );
}

/** Index chapters by normalized id and title for O(1) lookup. */
export function indexChaptersByKey<T extends ChapterKeyEntry>(
  chapters: T[],
): Map<string, T> {
  const map = new Map<string, T>();
  for (const chapter of chapters) {
    map.set(chapter.id, chapter);
    map.set(normalizeChapterKey(chapter.id), chapter);
    if (chapter.title) {
      map.set(normalizeChapterKey(chapter.title), chapter);
    }
  }
  return map;
}
