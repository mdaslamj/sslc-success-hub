import type { CatalogChapter } from "@/data/sslc-academic-catalog";
import {
  MATHEMATICS_CHAPTERS,
  SCIENCE_CHAPTERS,
  SOCIAL_SCIENCE_CHAPTERS,
} from "@/data/sslc-academic-catalog";
import type { PlannerEngineChapter } from "@/lib/taskPriorityEngine";

/** Flatten core SSLC catalog chapters for the task priority engine. */
export function buildPlannerChapterPool(): PlannerEngineChapter[] {
  const attach = (subjectId: string, chapters: CatalogChapter[]): PlannerEngineChapter[] =>
    chapters.map((ch) => ({
      id: ch.id,
      title: ch.title,
      subjectId,
      mastery: ch.mastery,
      blueprintMarks: ch.blueprintMarks ?? 4,
      difficulty: ch.difficulty,
    }));

  return [
    ...attach("math", MATHEMATICS_CHAPTERS),
    ...attach("science", SCIENCE_CHAPTERS),
    ...attach("social", SOCIAL_SCIENCE_CHAPTERS),
  ];
}
