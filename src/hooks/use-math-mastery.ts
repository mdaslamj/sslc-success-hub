import { useQueries, useQuery } from "@tanstack/react-query";
import {
  fetchMathChapter,
  fetchMathChapterAnalytics,
  fetchMathChapters,
  fetchRecentExamResults,
  fetchUserEvaluations,
} from "@/integrations/firebase/services";
import { aggregateChapterMastery } from "@/lib/math-intelligence/mastery-aggregator";
import { useCurrentUserId } from "./use-current-user";

/**
 * Per-chapter aggregated mastery — used by the Math Chapter Hub.
 * Combines quiz analytics, mock exam math performance and OCR evaluations.
 */
export function useChapterMastery(chapterId: string | undefined) {
  const userId = useCurrentUserId();
  const queries = useQueries({
    queries: [
      {
        queryKey: ["math", "chapter", chapterId],
        queryFn: () => fetchMathChapter(chapterId!),
        enabled: !!chapterId,
      },
      {
        queryKey: ["math", "analytics", userId, chapterId],
        queryFn: () => fetchMathChapterAnalytics(userId, chapterId!),
        enabled: !!chapterId && !!userId,
      },
      {
        queryKey: ["evaluations", userId],
        queryFn: () => fetchUserEvaluations(userId, 50),
        enabled: !!userId,
      },
      {
        queryKey: ["mockResults", userId],
        queryFn: () => fetchRecentExamResults(userId, 10),
        enabled: !!userId,
      },
    ],
  });

  const [chapterQ, analyticsQ, evalsQ, mocksQ] = queries;
  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);

  const chapter = chapterQ.data ?? null;
  const mastery = chapter
    ? aggregateChapterMastery({
        chapter,
        analytics: analyticsQ.data ?? null,
        evaluations: evalsQ.data ?? [],
        mockResults: mocksQ.data ?? [],
      })
    : null;

  return { chapter, mastery, isLoading, isError };
}

/**
 * Mastery for every math chapter — used by the chapter list and predictions
 * ranking. Reads each per-chapter analytics doc lazily through a single
 * react-query so callers stay declarative.
 */
export function useAllChapterMastery() {
  const userId = useCurrentUserId();

  const chaptersQ = useQuery({
    queryKey: ["math", "chapters"],
    queryFn: fetchMathChapters,
    staleTime: 5 * 60 * 1000,
  });
  const evalsQ = useQuery({
    queryKey: ["evaluations", userId],
    queryFn: () => fetchUserEvaluations(userId, 100),
    enabled: !!userId,
  });
  const mocksQ = useQuery({
    queryKey: ["mockResults", userId],
    queryFn: () => fetchRecentExamResults(userId, 10),
    enabled: !!userId,
  });

  const chapters = chaptersQ.data ?? [];
  const analyticsQs = useQueries({
    queries: chapters.map((c) => ({
      queryKey: ["math", "analytics", userId, c.id],
      queryFn: () => fetchMathChapterAnalytics(userId, c.id),
      enabled: !!userId,
    })),
  });

  const byId = new Map<string, ReturnType<typeof aggregateChapterMastery>>();
  chapters.forEach((c, i) => {
    byId.set(
      c.id,
      aggregateChapterMastery({
        chapter: c,
        analytics: analyticsQs[i]?.data ?? null,
        evaluations: evalsQ.data ?? [],
        mockResults: mocksQ.data ?? [],
      }),
    );
  });

  return {
    chapters,
    masteryById: byId,
    isLoading:
      chaptersQ.isLoading ||
      analyticsQs.some((q) => q.isLoading) ||
      evalsQ.isLoading ||
      mocksQ.isLoading,
  };
}
