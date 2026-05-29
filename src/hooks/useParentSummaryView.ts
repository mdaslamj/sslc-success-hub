import { useMemo } from "react";
import { useAuthOptional } from "@/contexts/auth-context";
import { useAuraEngines } from "@/hooks/useAuraEngines";
import { useParentDashboard } from "@/hooks/use-parent-dashboard";
import {
  buildDemoParentSummary,
  buildParentSummary,
} from "@/lib/parentSummaryService";
import type { ParentSummary } from "@/types/parentView";

export function useParentSummaryView(): {
  summary: ParentSummary | null;
  loading: boolean;
  isStudentView: boolean;
} {
  const auth = useAuthOptional();
  const enginesBundle = useAuraEngines();
  const { profile, isLoading } = enginesBundle;
  const parent = useParentDashboard();

  const engineSlice = useMemo(
    () => ({
      projection: enginesBundle.projection,
      momentum: enginesBundle.momentum,
    }),
    [enginesBundle.projection, enginesBundle.momentum],
  );

  const studentSummary = useMemo(() => {
    if (!profile) return null;
    return buildParentSummary(profile, engineSlice);
  }, [profile, engineSlice]);

  const linkedSummary = useMemo(() => {
    if (!parent.activeStudent) return null;
    return buildDemoParentSummary(parent.activeStudent.studentName ?? "Your child");
  }, [parent.activeStudent]);

  const isStudentView = Boolean(
    auth?.profile?.role === "student" || parent.linkedStudents.length === 0,
  );

  if (isLoading || parent.loading) {
    return { summary: null, loading: true, isStudentView };
  }

  if (parent.activeStudent && parent.linkedStudents.length > 0) {
    return { summary: linkedSummary, loading: false, isStudentView: false };
  }

  return { summary: studentSummary, loading: false, isStudentView: true };
}
