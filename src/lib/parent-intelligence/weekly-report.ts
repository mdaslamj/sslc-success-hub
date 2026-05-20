/**
 * Pure weekly-report generator. Computes the summary doc from a student
 * snapshot — designed to be called either client-side (parent app on view)
 * or from a scheduled server function later.
 */
import type { ParentWeeklyReportDoc } from "@/integrations/firebase/types";
import type { StudentSnapshot } from "./alerts";
import { weekKeyOf } from "./codes";
import { PARENT_SUGGESTIONS, softenPhrase } from "./emotional";

export type WeeklyReportInput = {
  parentUid: string;
  student: StudentSnapshot;
  /** Optional per-subject mastery roster (id, name, mastery). */
  subjects: { id: string; name: string; mastery: number }[];
  /** Optional chapter-level weak roster. */
  weakChapters: { subject: string; chapter: string; mastery: number }[];
  mockExamsAttempted: number;
  date?: Date;
};

export function buildWeeklyReport(input: WeeklyReportInput): ParentWeeklyReportDoc {
  const { parentUid, student: s, subjects, weakChapters, mockExamsAttempted } = input;
  const date = input.date ?? new Date();
  const weekKey = weekKeyOf(date);

  const rangeEnd = date.getTime();
  const rangeStart = rangeEnd - 7 * 86400000;

  const strengths = subjects
    .filter((s2) => s2.mastery >= 70)
    .sort((a, b) => b.mastery - a.mastery)
    .slice(0, 3)
    .map((s2) => `${s2.name} · ${Math.round(s2.mastery)}%`);

  const suggestions: string[] = [];
  if (s.weakSubjects[0]) suggestions.push(PARENT_SUGGESTIONS.weakSubject(s.weakSubjects[0].name));
  if (s.daysSinceRevision >= 3) suggestions.push(PARENT_SUGGESTIONS.revisionOverdue());
  if (s.confidenceTrend < -0.1) suggestions.push(PARENT_SUGGESTIONS.confidenceDecline());
  if (s.readinessDelta >= 3) suggestions.push(PARENT_SUGGESTIONS.improvement());
  if (s.weeklyMinutes < 180) suggestions.push(PARENT_SUGGESTIONS.lowStudyTime());
  if (!suggestions.length) suggestions.push(PARENT_SUGGESTIONS.boardReadiness());

  return {
    id: weekKey,
    parentUid,
    studentUid: s.studentUid,
    weekKey,
    rangeStart,
    rangeEnd,
    studyMinutes: s.weeklyMinutes,
    plannerCompletionPct: s.plannerCompletionPct,
    revisionCompleted: Math.max(0, Math.round(s.weeklyMinutes / 25) - s.revisionDue),
    mockExamsAttempted,
    averageConfidence: s.averageConfidence,
    boardReadiness: s.boardReadiness,
    readinessDelta: s.readinessDelta,
    streak: { current: s.streakCurrent, longest: s.streakCurrent },
    strengths: strengths.length ? strengths : ["Showing up daily — the real predictor."],
    weakChapters: weakChapters.slice(0, 4),
    parentSuggestions: suggestions.slice(0, 4).map(softenPhrase),
    generatedAt: Date.now(),
  };
}