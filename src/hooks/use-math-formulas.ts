import { useQuery } from "@tanstack/react-query";
import {
  fetchMathFormulas,
  fetchMathFormulasForChapter,
} from "@/integrations/firebase/services";

export function useMathFormulas() {
  return useQuery({
    queryKey: ["math", "formulas"],
    queryFn: fetchMathFormulas,
    staleTime: 10 * 60 * 1000,
  });
}

export function useMathChapterFormulas(chapterId: string | undefined) {
  return useQuery({
    queryKey: ["math", "formulas", "chapter", chapterId],
    queryFn: () => fetchMathFormulasForChapter(chapterId!),
    enabled: !!chapterId,
    staleTime: 10 * 60 * 1000,
  });
}