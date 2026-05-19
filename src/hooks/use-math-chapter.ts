import { useQuery } from "@tanstack/react-query";
import {
  fetchMathChapter,
  fetchMathChapters,
  fetchMathChaptersByWeight,
} from "@/integrations/firebase/services";

export function useMathChapters() {
  return useQuery({
    queryKey: ["math", "chapters"],
    queryFn: fetchMathChapters,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMathChaptersByWeight() {
  return useQuery({
    queryKey: ["math", "chapters", "by-weight"],
    queryFn: fetchMathChaptersByWeight,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMathChapter(chapterId: string | undefined) {
  return useQuery({
    queryKey: ["math", "chapter", chapterId],
    queryFn: () => fetchMathChapter(chapterId!),
    enabled: !!chapterId,
    staleTime: 5 * 60 * 1000,
  });
}