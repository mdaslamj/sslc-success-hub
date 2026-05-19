import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAllMemoryTracking,
  fetchMemoryTracking,
  fetchRevisionQueueItem,
  saveMemoryTracking,
  updateRevisionQueueCard,
  updateRetentionScore,
} from "@/integrations/firebase/services";
import type {
  MemoryTrackingDoc,
  RevisionQueueDoc,
  WeaknessProfileDoc,
} from "@/integrations/firebase/types";
import {
  buildMemoryTracking,
  computeRetentionScore,
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

/* ----------------------------- retention score ---------------------------- */

/** Read the retention score (0..100) for a single chapter. */
export function useRetentionScore(chapterId: string) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: ["adaptive", "retention", userId, chapterId],
    queryFn: async () => {
      const doc = await fetchMemoryTracking(userId!, chapterId);
      return doc
        ? {
            retentionScore: doc.retentionScore ?? null,
            band: doc.retentionBand ?? null,
            inputs: doc.retentionInputs ?? null,
            updatedAt: doc.updatedAt,
          }
        : null;
    },
    enabled: !!userId && !!chapterId,
    staleTime: 30 * 1000,
  });
}

/**
 * Recompute and persist retentionScore for a chapter using the latest
 * performance signals. Call from quiz / mock / OCR result handlers.
 */
export function useUpdateRetentionScore() {
  const userId = useCurrentUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      chapterId: string;
      subjectId?: string;
      /** Defaults to the existing memoryTracking doc fields. */
      lastPracticed?: number;
      intervalDays?: number;
      recentMistakes?: number;
      quizAccuracy?: number;
      ocrQuality?: number;
      confidenceDecay?: number;
    }) => {
      if (!userId) throw new Error("Sign in required");
      const prev = await fetchMemoryTracking(userId, input.chapterId);
      const lastPracticed = input.lastPracticed ?? prev?.lastPracticed ?? Date.now();
      const intervalDays = input.intervalDays ?? prev?.nextInterval ?? 7;
      const { retentionScore, inputs, band } = computeRetentionScore({
        lastPracticed,
        intervalDays,
        recentMistakes:
          input.recentMistakes ?? prev?.retentionInputs?.recentMistakes ?? 0,
        quizAccuracy:
          input.quizAccuracy ?? prev?.retentionInputs?.quizAccuracy,
        ocrQuality: input.ocrQuality ?? prev?.retentionInputs?.ocrQuality,
        confidenceDecay: input.confidenceDecay ?? prev?.confidenceDecay,
      });
      await updateRetentionScore(userId, input.chapterId, {
        subjectId: input.subjectId ?? prev?.subjectId,
        retentionScore,
        retentionInputs: inputs,
        retentionBand: band,
      });
      return { retentionScore, band, inputs };
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["adaptive", "memory", userId] });
      qc.invalidateQueries({
        queryKey: ["adaptive", "retention", userId, vars.chapterId],
      });
    },
  });
}