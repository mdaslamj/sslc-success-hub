import { chapterKeysMatch, normalizeChapterKey } from "@/lib/normalizeChapterKey";
import type { StudentLearningProfile, Subject } from "@/types/aura-engine-contracts";

type CatalogChapterRef = {
  id: string;
  title: string;
};

/** Resolve a profile chapter key from catalog id/title variants. */
export function resolveProfileChapterKey(
  profile: StudentLearningProfile,
  subject: Subject,
  catalogChapter: CatalogChapterRef,
): string {
  const entries = profile.chapterMastery[subject];
  const normalizedId = normalizeChapterKey(catalogChapter.id);
  const normalizedTitle = normalizeChapterKey(catalogChapter.title);

  if (entries) {
    for (const key of Object.keys(entries)) {
      if (key.startsWith("_")) continue;
      const normalizedKey = normalizeChapterKey(key);
      if (
        chapterKeysMatch(key, catalogChapter.id) ||
        chapterKeysMatch(key, catalogChapter.title) ||
        normalizedId.includes(normalizedKey) ||
        normalizedKey.includes(normalizedId) ||
        normalizedTitle.includes(normalizedKey) ||
        normalizedKey.includes(normalizedTitle)
      ) {
        return key;
      }
    }
  }

  return normalizedId;
}

export function readProfileChapterMastery(
  profile: StudentLearningProfile,
  subjectId: string,
  catalogChapter: CatalogChapterRef,
  fallback = 0,
): number {
  if (!["math", "science", "social"].includes(subjectId)) {
    return fallback;
  }

  const subject = subjectId as Subject;
  const key = resolveProfileChapterKey(profile, subject, catalogChapter);
  return profile.chapterMastery[subject]?.[key]?.mastery ?? fallback;
}
