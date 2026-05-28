import type { CatalogChapter } from "@/data/sslc-academic-catalog";
import {
  ENGLISH_CHAPTERS,
  HINDI_CHAPTERS,
  KANNADA_CHAPTERS,
  MATHEMATICS_CHAPTERS,
  SCIENCE_CHAPTERS,
  SOCIAL_SCIENCE_CHAPTERS,
} from "@/data/sslc-academic-catalog";
import { readProfileChapterMastery } from "@/lib/chapter-profile-key";
import type { StudentLearningProfile } from "@/types/aura-engine-contracts";

export type ConstellationChapter = {
  id: string;
  subjectId: string;
  name: string;
  blueprintMarks: number;
  mastery: number;
};

function attach(
  subjectId: string,
  chapters: CatalogChapter[],
  profile?: StudentLearningProfile,
): ConstellationChapter[] {
  return chapters.map((ch) => ({
    id: ch.id,
    subjectId,
    name: ch.title,
    blueprintMarks: ch.blueprintMarks ?? 4,
    mastery: profile
      ? readProfileChapterMastery(profile, subjectId, ch, ch.mastery ?? 0)
      : (ch.mastery ?? 0),
  }));
}

/** All six SSLC subjects — chapter stars for the Aura Constellation. */
export function buildConstellationChapterPool(
  profile?: StudentLearningProfile,
): ConstellationChapter[] {
  return [
    ...attach("science", SCIENCE_CHAPTERS, profile),
    ...attach("math", MATHEMATICS_CHAPTERS, profile),
    ...attach("social", SOCIAL_SCIENCE_CHAPTERS, profile),
    ...attach("english", ENGLISH_CHAPTERS, profile),
    ...attach("kannada", KANNADA_CHAPTERS, profile),
    ...attach("hindi", HINDI_CHAPTERS, profile),
  ];
}
