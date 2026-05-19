import { useQuery } from "@tanstack/react-query";
import {
  fetchMathQuestion,
  fetchMathQuestions,
  type MathQuestionFilter,
} from "@/integrations/firebase/services";

export function useMathQuestions(filter: MathQuestionFilter = {}) {
  return useQuery({
    queryKey: ["math", "questions", filter],
    queryFn: () => fetchMathQuestions(filter),
    staleTime: 60 * 1000,
  });
}

export function useMathQuestion(questionId: string | undefined) {
  return useQuery({
    queryKey: ["math", "question", questionId],
    queryFn: () => fetchMathQuestion(questionId!),
    enabled: !!questionId,
    staleTime: 5 * 60 * 1000,
  });
}