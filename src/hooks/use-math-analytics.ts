import { useQuery } from "@tanstack/react-query";
import { fetchMathChapterAnalytics } from "@/integrations/firebase/services";
import { useCurrentUserId } from "./use-current-user";

export function useMathChapterAnalytics(chapterId: string | undefined) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: ["math", "analytics", userId, chapterId],
    queryFn: () => fetchMathChapterAnalytics(userId, chapterId!),
    enabled: !!chapterId && !!userId,
    staleTime: 30 * 1000,
  });
}