import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchLatestBoardReadiness,
  listBoardReadiness,
  saveBoardReadiness,
} from "@/integrations/firebase/services/board-readiness";
import {
  computeBoardReadiness,
  readinessRecommendations,
  recommendDifficulty,
  type ReadinessInputs,
} from "@/lib/board-readiness";

const keys = {
  latest: (uid: string) => ["boardReadiness", uid, "latest"] as const,
  list: (uid: string) => ["boardReadiness", uid, "list"] as const,
};

export function useLatestBoardReadiness(userId: string | undefined) {
  return useQuery({
    queryKey: keys.latest(userId ?? "anon"),
    enabled: !!userId,
    queryFn: () => fetchLatestBoardReadiness(userId!),
  });
}

export function useBoardReadinessHistory(
  userId: string | undefined,
  max = 20,
) {
  return useQuery({
    queryKey: keys.list(userId ?? "anon"),
    enabled: !!userId,
    queryFn: () => listBoardReadiness(userId!, max),
  });
}

/**
 * Compute and persist a Board Readiness Index from current signals.
 * Returns the saved doc (with adaptive recommendations).
 */
export function useBoardReadinessPrediction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      userId: string;
      inputs: ReadinessInputs;
      sourceSimulationId?: string;
    }) => {
      const result = computeBoardReadiness(args.inputs);
      const recs = readinessRecommendations(result.band);
      const saved = await saveBoardReadiness({
        userId: args.userId,
        readinessScore: result.readinessScore,
        band: result.band,
        contributingFactors: result.contributingFactors,
        chapters: result.chapters,
        recommendations: recs,
        predictionDate: Date.now(),
        sourceSimulationId: args.sourceSimulationId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return saved;
    },
    onSuccess: (doc) => {
      qc.invalidateQueries({ queryKey: keys.latest(doc.userId) });
      qc.invalidateQueries({ queryKey: keys.list(doc.userId) });
    },
  });
}

export { recommendDifficulty };