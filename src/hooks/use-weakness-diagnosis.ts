import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchAllRemediationPlans,
  fetchAllWeaknessProfiles,
  fetchChapterIntelligence,
  fetchPerformanceRecords,
  fetchRemediationPlansForChapter,
  fetchWeaknessProfile,
  recordPerformance,
  saveRemediationPlan,
  saveWeaknessProfile,
  updateRemediationPlanStatus,
} from "@/integrations/firebase/services";
import type {
  ChapterDoc,
  PerformanceRecordDoc,
  RemediationPlanDoc,
  RemediationStatus,
  WeaknessProfileDoc,
} from "@/integrations/firebase/types";
import {
  buildRemediationPlan,
  diagnoseWeakness,
} from "@/lib/diagnosis";
import { useCurrentUserId } from "./use-current-user";

/* ----------------------------- Performance ----------------------------- */

export function usePerformanceRecords(chapterId?: string) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: ["diagnosis", "performance", userId, chapterId ?? "all"],
    queryFn: () =>
      fetchPerformanceRecords(userId!, { chapterId, max: 200 }),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

export function useRecordPerformance() {
  const userId = useCurrentUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<PerformanceRecordDoc, "id" | "userId" | "createdAt">) => {
      if (!userId) throw new Error("Sign in required");
      return recordPerformance({ ...input, userId });
    },
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ["diagnosis", "performance", userId] });
      qc.invalidateQueries({
        queryKey: ["diagnosis", "weakness", userId, vars.chapterId],
      });
    },
  });
}

/* ------------------------------ Weakness ------------------------------- */

export function useWeaknessProfile(chapterId: string | undefined) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: ["diagnosis", "weakness", userId, chapterId],
    queryFn: () => fetchWeaknessProfile(userId!, chapterId!),
    enabled: !!userId && !!chapterId,
    staleTime: 30 * 1000,
  });
}

export function useAllWeaknessProfiles() {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: ["diagnosis", "weakness", userId, "all"],
    queryFn: () => fetchAllWeaknessProfiles(userId!),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

/**
 * Re-run diagnosis for a chapter: fetch the latest records, recompute the
 * weakness profile, persist it. Returns the saved profile.
 */
export function useRunDiagnosis() {
  const userId = useCurrentUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (chapter: Pick<ChapterDoc, "id" | "subjectId"> & {
      totalBoardMarks?: number;
    }): Promise<WeaknessProfileDoc> => {
      if (!userId) throw new Error("Sign in required");
      const records = await fetchPerformanceRecords(userId, {
        chapterId: chapter.id,
        max: 500,
      });
      const previous = await fetchWeaknessProfile(userId, chapter.id);
      const profile = diagnoseWeakness({
        userId,
        subjectId: chapter.subjectId,
        chapter: { id: chapter.id, totalBoardMarks: chapter.totalBoardMarks },
        records,
        previous,
      });
      await saveWeaknessProfile(profile);
      return profile;
    },
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ["diagnosis", "weakness", userId, p.chapterId] });
      qc.invalidateQueries({ queryKey: ["diagnosis", "weakness", userId, "all"] });
    },
  });
}

/* ----------------------------- Remediation ----------------------------- */

export function useRemediationPlans(chapterId?: string) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: ["diagnosis", "remediation", userId, chapterId ?? "all"],
    queryFn: () =>
      chapterId
        ? fetchRemediationPlansForChapter(userId!, chapterId)
        : fetchAllRemediationPlans(userId!),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

export function useGenerateRemediationPlan() {
  const userId = useCurrentUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      profile: WeaknessProfileDoc;
      chapterTitle?: string;
      weakFormulaIds?: string[];
      relatedChapterIds?: string[];
      isBoardPriority?: boolean;
    }): Promise<RemediationPlanDoc> => {
      if (!userId) throw new Error("Sign in required");
      const plan = buildRemediationPlan({ userId, ...input });
      await saveRemediationPlan(plan);
      return plan;
    },
    onSuccess: (p) => {
      qc.invalidateQueries({
        queryKey: ["diagnosis", "remediation", userId, p.chapterId],
      });
      qc.invalidateQueries({
        queryKey: ["diagnosis", "remediation", userId, "all"],
      });
    },
  });
}

export function useUpdateRemediationStatus() {
  const userId = useCurrentUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { planId: string; status: RemediationStatus }) => {
      if (!userId) throw new Error("Sign in required");
      return updateRemediationPlanStatus(userId, input.planId, input.status);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["diagnosis", "remediation", userId] });
    },
  });
}

/* ------------------------- Chapter intelligence ------------------------ */

export function useChapterIntelligence(chapterId: string | undefined) {
  return useQuery({
    queryKey: ["diagnosis", "chapter-intelligence", chapterId],
    queryFn: () => fetchChapterIntelligence(chapterId!),
    enabled: !!chapterId,
    staleTime: 5 * 60 * 1000,
  });
}