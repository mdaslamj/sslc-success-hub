import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createExamSimulation,
  deleteExamSimulation,
  fetchExamSimulation,
  listExamSimulations,
  saveExamSimulation,
} from "@/integrations/firebase/services/exam-simulations";
import type {
  DifficultyLevel,
  ExamSimulationDoc,
} from "@/integrations/firebase/types";
import {
  buildExamSimulation,
  nextDifficulty,
  type ChapterBlueprint,
} from "@/lib/board-readiness";
import type { MemoryTrackingDoc } from "@/integrations/firebase/types";

const keys = {
  list: (uid: string) => ["examSimulations", uid] as const,
  one: (uid: string, id: string) => ["examSimulations", uid, id] as const,
};

export function useExamSimulations(userId: string | undefined) {
  return useQuery({
    queryKey: keys.list(userId ?? "anon"),
    enabled: !!userId,
    queryFn: () => listExamSimulations(userId!),
  });
}

export function useExamSimulation(
  userId: string | undefined,
  id: string | undefined,
) {
  return useQuery({
    queryKey: keys.one(userId ?? "anon", id ?? "none"),
    enabled: !!userId && !!id,
    queryFn: () => fetchExamSimulation(userId!, id!),
  });
}

/**
 * Generate a new simulation from chapter blueprints + memory snapshot.
 * Persists the draft and returns the created doc.
 */
export function useGenerateExamSimulation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      userId: string;
      blueprints: ChapterBlueprint[];
      difficultyLevel: DifficultyLevel;
      totalMarks?: number;
      durationMinutes?: number;
      memory?: MemoryTrackingDoc[];
    }) => {
      const draft = buildExamSimulation(args);
      return createExamSimulation(draft);
    },
    onSuccess: (sim) => {
      qc.invalidateQueries({ queryKey: keys.list(sim.userId) });
    },
  });
}

/** Persist updates to a simulation (status, scores, semantic feedback). */
export function useUpdateExamSimulation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (sim: ExamSimulationDoc) => {
      await saveExamSimulation(sim);
      return sim;
    },
    onSuccess: (sim) => {
      qc.invalidateQueries({ queryKey: keys.list(sim.userId) });
      qc.invalidateQueries({ queryKey: keys.one(sim.userId, sim.id) });
    },
  });
}

export function useDeleteExamSimulation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { userId: string; id: string }) => {
      await deleteExamSimulation(args.userId, args.id);
      return args;
    },
    onSuccess: ({ userId }) => {
      qc.invalidateQueries({ queryKey: keys.list(userId) });
    },
  });
}

export { nextDifficulty };