import { useMemo } from "react";
import {
  getSubjectAdapter,
  listSubjectAdapters,
  adapterSystemPromptFor,
  adaptedRetentionScore,
  applyAdapterToReadiness,
} from "@/lib/subject-adapters";
import type { SubjectAdapter } from "@/lib/subject-adapters";

/**
 * Resolve the subject adapter for a given subject id. Memoised so consumers
 * (planner widgets, tutor panels, prediction cards) get a stable reference.
 *
 * The hook is read-only — it never touches Firestore. It's the seam every
 * subject-aware feature should use instead of branching on subject id.
 */
export function useSubjectAdapter(subjectId: string | undefined): SubjectAdapter {
  return useMemo(() => getSubjectAdapter(subjectId), [subjectId]);
}

export function useAllSubjectAdapters(): SubjectAdapter[] {
  return useMemo(() => listSubjectAdapters(), []);
}

export function useSubjectSemanticPrompt(subjectId: string | undefined): string {
  return useMemo(() => adapterSystemPromptFor(subjectId), [subjectId]);
}

export { adaptedRetentionScore, applyAdapterToReadiness };