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
import { useAuthOptional } from "@/contexts/auth-context";

/**
 * Per-chapter aggregated mastery — used by the Math Chapter Hub.
 * Combines quiz analytics, mock exam math performance and OCR evaluations.
 */
export function useChapterMastery(chapterId: string | undefined) {
  const authCtx = useAuthOptional();
  const authedUserId = authCtx?.user?.uid ?? null;
  const queries = useQueries({
    queries: [
      {
        queryKey: ["math", "chapter", chapterId],
        queryFn: () => fetchMathChapter(chapterId!),
        enabled: !!chapterId,
      },
      {
        queryKey: ["math", "analytics", authedUserId, chapterId],
        queryFn: () => fetchMathChapterAnalytics(authedUserId!, chapterId!),
        enabled: !!chapterId && !!authedUserId,
      },
      {
        queryKey: ["evaluations", authedUserId],
        queryFn: () => fetchUserEvaluations(authedUserId!, 50),
        enabled: !!authedUserId,
      },
      {
        queryKey: ["mockResults", authedUserId],
        queryFn: () => fetchRecentExamResults(authedUserId!, 10),
        enabled: !!authedUserId,
      },
    ],
  });

  const [chapterQ, analyticsQ, evalsQ, mocksQ] = queries;
  const isChapterLoading = chapterQ.isLoading;
  const isChapterMissing = chapterQ.isSuccess && chapterQ.data == null;
  const isLoading = isChapterLoading;
  const isError = chapterQ.isError;

  const chapter = chapterQ.data ?? null;
  const mastery = chapter
    ? aggregateChapterMastery({
        chapter,
        analytics: analyticsQ.data ?? null,
        evaluations: evalsQ.data ?? [],
        mockResults: mocksQ.data ?? [],
      })
    : null;

  return {
    chapter,
    mastery,
    isLoading,
    isChapterLoading,
    isChapterMissing,
    isError,
    isAuthenticated: !!authedUserId,
  };
}

/**
 * Mastery for every math chapter — used by the chapter list and predictions
 * ranking. Reads each per-chapter analytics doc lazily through a single
 * react-query so callers stay declarative.
 */
export function useAllChapterMastery() {
  const authCtx = useAuthOptional();
  const authedUserId = authCtx?.user?.uid ?? null;
  const userId = useCurrentUserId();
  void userId;

  const chaptersQ = useQuery({
    queryKey: ["math", "chapters"],
    queryFn: fetchMathChapters,
    staleTime: 5 * 60 * 1000,
  });
  const evalsQ = useQuery({
    queryKey: ["evaluations", authedUserId],
    queryFn: () => fetchUserEvaluations(authedUserId!, 100),
    enabled: !!authedUserId,
  });
  const mocksQ = useQuery({
    queryKey: ["mockResults", authedUserId],
    queryFn: () => fetchRecentExamResults(authedUserId!, 10),
    enabled: !!authedUserId,
  });

  const chapters = chaptersQ.data ?? [];
  const analyticsQs = useQueries({
    queries: chapters.map((c) => ({
      queryKey: ["math", "analytics", authedUserId, c.id],
      queryFn: () => fetchMathChapterAnalytics(authedUserId!, c.id),
      enabled: !!authedUserId,
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
