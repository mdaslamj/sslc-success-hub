import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAllMemoryTracking,
  fetchMemoryTracking,
  fetchRevisionQueueItem,
  saveMemoryTracking,
  updateRevisionQueueCard,
} from "@/integrations/firebase/services";
import type {
  MemoryTrackingDoc,
  RevisionQueueDoc,
  WeaknessProfileDoc,
} from "@/integrations/firebase/types";
import {
  buildMemoryTracking,
  refreshRevisionQueueCard,
} from "@/lib/adaptive-planner";
import { useCurrentUserId } from "./use-current-user";

/* ----------------------------- memory tracking ---------------------------- */

export function useMemoryTracking(chapterId: string) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: ["adaptive", "memory", userId, chapterId],
    queryFn: () => fetchMemoryTracking(userId!, chapterId),
    enabled: !!userId && !!chapterId,
    staleTime: 60 * 1000,
  });
}

export function useAllMemoryTracking() {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: ["adaptive", "memory", userId, "all"],
    queryFn: () => fetchAllMemoryTracking(userId!),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

export function useUpdateMemoryTracking() {
  const userId = useCurrentUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      profile: WeaknessProfileDoc;
      lastPracticed?: number;
      lastMistake?: number | null;
      previous?: MemoryTrackingDoc | null;
    }) => {
      if (!userId) throw new Error("Sign in required");
      const doc = buildMemoryTracking({ userId, ...input });
      await saveMemoryTracking(doc);
      return doc;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adaptive", "memory", userId] });
    },
  });
}

/* --------------------- revision queue dynamic priority -------------------- */

/**
 * Recompute and persist the dynamic priority / decay fields of a
 * revision-queue card using the latest confidence snapshot.
 */
export function useUpdateRevisionQueuePriority() {
  const userId = useCurrentUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      queueId: string;
      confidenceScore: number;
      previousConfidence?: number;
      lastMistake?: number | null;
      boardWeight?: number;
      /** Optional pre-fetched card to avoid the extra round-trip. */
      card?: RevisionQueueDoc;
    }) => {
      if (!userId) throw new Error("Sign in required");
      const card =
        input.card ?? (await fetchRevisionQueueItem(userId, input.queueId));
      if (!card) throw new Error("Revision queue card not found");
      const next = refreshRevisionQueueCard({
        card,
        confidenceScore: input.confidenceScore,
        previousConfidence: input.previousConfidence,
        lastMistake: input.lastMistake,
        boardWeight: input.boardWeight,
      });
      await updateRevisionQueueCard(userId, card.id, {
        priority: next.priority,
        scheduledDate: next.scheduledDate,
        confidenceScore: next.confidenceScore,
        confidenceDecay: next.confidenceDecay,
        interval: next.interval,
        lastMistake: next.lastMistake,
      });
      return next;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adaptive", "revision-queue", userId] });
    },
  });
}