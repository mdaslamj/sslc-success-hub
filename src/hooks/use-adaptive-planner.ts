import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  completeRemediationSession,
  enqueueRevision,
  fetchAdaptiveSchedule,
  fetchInterventionPlan,
  fetchInterventionPlans,
  fetchRecentAdaptiveSchedules,
  fetchRemediationSessions,
  fetchRevisionQueue,
  saveAdaptiveSchedule,
  saveInterventionPlan,
  saveRemediationSession,
  setRevisionQueueStatus,
  updateInterventionPlanStatus,
} from "@/integrations/firebase/services";
import type {
  InterventionStatus,
  RemediationSessionDoc,
  RemediationSessionType,
  RevisionQueueStatus,
  WeaknessProfileDoc,
} from "@/integrations/firebase/types";
import {
  buildAdaptiveSchedule,
  buildInterventionPlan,
  buildRemediationSession,
  buildRevisionQueueEntry,
  scoreInterventionPriority,
  type ChapterContext,
  type PriorityInput,
} from "@/lib/adaptive-planner";
import { useCurrentUserId } from "./use-current-user";

/* --------------------------- intervention plans -------------------------- */

export function useInterventionPlans(opts: {
  chapterId?: string;
  status?: InterventionStatus;
} = {}) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: ["adaptive", "interventions", userId, opts.chapterId ?? "all", opts.status ?? "any"],
    queryFn: () => fetchInterventionPlans(userId!, opts),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

export function useInterventionPlan(planId: string | undefined) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: ["adaptive", "interventions", userId, "single", planId],
    queryFn: () => fetchInterventionPlan(userId!, planId!),
    enabled: !!userId && !!planId,
    staleTime: 30 * 1000,
  });
}

export function useGenerateInterventionPlan() {
  const userId = useCurrentUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PriorityInput) => {
      if (!userId) throw new Error("Sign in required");
      const plan = buildInterventionPlan({ userId, ...input });
      await saveInterventionPlan(plan);
      return plan;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adaptive", "interventions", userId] });
    },
  });
}

export function useUpdateInterventionStatus() {
  const userId = useCurrentUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { planId: string; status: InterventionStatus }) => {
      if (!userId) throw new Error("Sign in required");
      return updateInterventionPlanStatus(userId, input.planId, input.status);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adaptive", "interventions", userId] });
    },
  });
}

/* --------------------------- adaptive schedules -------------------------- */

export function useAdaptiveSchedule(scheduleId: string | undefined) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: ["adaptive", "schedule", userId, scheduleId],
    queryFn: () => fetchAdaptiveSchedule(userId!, scheduleId!),
    enabled: !!userId && !!scheduleId,
    staleTime: 30 * 1000,
  });
}

export function useRecentAdaptiveSchedules(limit = 14) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: ["adaptive", "schedule", userId, "recent", limit],
    queryFn: () => fetchRecentAdaptiveSchedules(userId!, limit),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

export function useGenerateAdaptiveSchedule() {
  const userId = useCurrentUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      chapters: ChapterContext[];
      dailyTaskBudget?: number;
      weeklyTaskBudget?: number;
      daysToExam?: number;
    }) => {
      if (!userId) throw new Error("Sign in required");
      const schedule = buildAdaptiveSchedule({ userId, ...input });
      await saveAdaptiveSchedule(schedule);
      return schedule;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adaptive", "schedule", userId] });
    },
  });
}

/* ----------------------------- revision queue ---------------------------- */

export function useRevisionQueue(opts: {
  status?: RevisionQueueStatus;
  dueBefore?: number;
} = {}) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: ["adaptive", "revision-queue", userId, opts.status ?? "any", opts.dueBefore ?? "any"],
    queryFn: () => fetchRevisionQueue(userId!, opts),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

export function useEnqueueRevision() {
  const userId = useCurrentUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      profile: WeaknessProfileDoc;
      priorityScore?: number;
      boardWeight?: number;
    }) => {
      if (!userId) throw new Error("Sign in required");
      const priorityScore =
        input.priorityScore ??
        scoreInterventionPriority({
          profile: input.profile,
          boardWeight: input.boardWeight,
        }).priorityScore;
      const entry = buildRevisionQueueEntry({
        userId,
        profile: input.profile,
        priorityScore,
      });
      await enqueueRevision(entry);
      return entry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adaptive", "revision-queue", userId] });
    },
  });
}

export function useSetRevisionQueueStatus() {
  const userId = useCurrentUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { queueId: string; status: RevisionQueueStatus }) => {
      if (!userId) throw new Error("Sign in required");
      return setRevisionQueueStatus(userId, input.queueId, input.status);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adaptive", "revision-queue", userId] });
    },
  });
}

/* --------------------------- remediation sessions ------------------------ */

export function useRemediationSessions(opts: {
  chapterId?: string;
  type?: RemediationSessionType;
} = {}) {
  const userId = useCurrentUserId();
  return useQuery({
    queryKey: ["adaptive", "remediation-sessions", userId, opts.chapterId ?? "all", opts.type ?? "any"],
    queryFn: () => fetchRemediationSessions(userId!, opts),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

export function useScheduleRemediationSession() {
  const userId = useCurrentUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      profile: WeaknessProfileDoc;
      triggers: PriorityInput extends infer T ? never : never;
    } | {
      profile: WeaknessProfileDoc;
      triggers: ReturnType<typeof scoreInterventionPriority>["triggers"];
      scheduledAt?: number;
    }) => {
      if (!userId) throw new Error("Sign in required");
      const session = buildRemediationSession({ userId, ...input });
      await saveRemediationSession(session);
      return session;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adaptive", "remediation-sessions", userId] });
    },
  });
}

export function useCompleteRemediationSession() {
  const userId = useCurrentUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { sessionId: string; outcome?: RemediationSessionDoc["outcome"] }) => {
      if (!userId) throw new Error("Sign in required");
      return completeRemediationSession(userId, input.sessionId, input.outcome);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["adaptive", "remediation-sessions", userId] });
    },
  });
}