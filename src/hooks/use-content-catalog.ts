/**
 * Loads the content question index for every subject that ships JSON under
 * `public/content/chapters/`. Single hook so both the Quizzes and Mock Exams
 * routes hit the same in-memory cache.
 */

import { useQueries } from "@tanstack/react-query";
import {
  CONTENT_SUBJECTS,
  loadIndexedSubject,
  type IndexedChapter,
} from "@/lib/content-question-index";
import { subjects as runtimeSubjects } from "@/lib/mock-data";

export type ContentSubject = {
  contentId: string;
  runtimeId: string;
  name: string;
  chapters: IndexedChapter[];
};

export function useContentCatalog() {
  const queries = useQueries({
    queries: CONTENT_SUBJECTS.map((s) => ({
      queryKey: ["content-index", s.contentId, "v3"],
      queryFn: () => loadIndexedSubject(s.contentId),
      staleTime: 10 * 60_000,
      gcTime: 30 * 60_000,
    })),
  });

  const subjects: ContentSubject[] = CONTENT_SUBJECTS.map((s, i) => ({
    contentId: s.contentId,
    runtimeId: s.runtimeId,
    name: runtimeSubjects.find((x) => x.id === s.runtimeId)?.name ?? s.runtimeId,
    chapters: queries[i].data ?? [],
  }));

  return {
    subjects,
    isLoading: queries.some((q) => q.isLoading),
    isError: queries.some((q) => q.isError),
  };
}