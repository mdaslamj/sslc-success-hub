import { useMemo, useRef } from "react";
import {
  buildAcademicExecutionSnapshot,
  type AcademicExecutionSnapshot,
  type PlannerTaskSnapshot,
} from "@/core/academic-state";
import { useStudentProfile } from "@/hooks/useStudentProfile";

export type UseAcademicExecutionOptions = {
  tasks: PlannerTaskSnapshot[];
};

export type UseAcademicExecutionResult = {
  snapshot: AcademicExecutionSnapshot;
  isLoading: boolean;
  /** Bump persisted profile when AI engine wiring lands. */
  isMockAdapter: true;
};

/**
 * Temporary adapter: derives live trajectory from planner tasks + seed profile.
 * Replace mock deltas with engine writes once AI prediction is connected.
 */
export function useAcademicExecution({
  tasks,
}: UseAcademicExecutionOptions): UseAcademicExecutionResult {
  const { profile, isLoading } = useStudentProfile();
  const previousGapRef = useRef<number | undefined>(undefined);

  const snapshot = useMemo(() => {
    const next = buildAcademicExecutionSnapshot(profile, tasks, previousGapRef.current);
    previousGapRef.current = next.gap;
    return next;
  }, [profile, tasks]);

  return { snapshot, isLoading, isMockAdapter: true };
}
