/**
 * Class analytics aggregator — turns a roster of student summaries into a
 * single ClassAnalyticsDoc for the teacher dashboard.
 */
import type {
  ClassAnalyticsDoc,
  TeacherStudentSummary,
} from "@/integrations/firebase/types";

export type AggregateInput = {
  classId: string;
  teacherUid: string;
  dayKey: string;
  roster: { studentUid: string; studentName?: string; summary: TeacherStudentSummary }[];
};

export function aggregateClassAnalytics(input: AggregateInput): ClassAnalyticsDoc {
  const { classId, teacherUid, dayKey, roster } = input;
  const n = Math.max(roster.length, 1);

  const avg = (sel: (s: TeacherStudentSummary) => number) =>
    roster.reduce((acc, r) => acc + sel(r.summary), 0) / n;

  const averageReadiness = avg((s) => s.boardReadiness);
  const averageConfidence = avg((s) => s.averageConfidence);
  const averageStudyMinutes = avg((s) => s.weeklyMinutes);
  const plannerCompletionPct = avg((s) => s.plannerCompletionPct);

  // Weak chapters — tally weak subjects (as a proxy for chapters).
  const tally = new Map<
    string,
    { subject: string; chapter: string; mastery: number; affectedStudents: number; total: number }
  >();
  for (const r of roster) {
    for (const w of r.summary.weakSubjects) {
      const key = w.id;
      const t = tally.get(key) ?? {
        subject: w.name,
        chapter: `${w.name} fundamentals`,
        mastery: 0,
        affectedStudents: 0,
        total: 0,
      };
      t.total += w.mastery;
      t.affectedStudents += 1;
      t.mastery = t.total / t.affectedStudents;
      tally.set(key, t);
    }
  }
  const weakChapters = [...tally.values()]
    .sort((a, b) => b.affectedStudents - a.affectedStudents || a.mastery - b.mastery)
    .slice(0, 5)
    .map(({ subject, chapter, mastery, affectedStudents }) => ({
      subject,
      chapter,
      mastery: Math.round(mastery),
      affectedStudents,
    }));

  // Common mistakes — heuristic placeholder until OCR pipeline aggregates.
  const commonMistakes = weakChapters.slice(0, 3).map((c) => ({
    label: `Sign errors in ${c.subject}`,
    affectedStudents: c.affectedStudents,
  }));

  // Performance segmentation.
  let onTrack = 0,
    needsAttention = 0,
    atRisk = 0;
  for (const r of roster) {
    const rd = r.summary.boardReadiness;
    if (rd >= 75) onTrack += 1;
    else if (rd >= 55) needsAttention += 1;
    else atRisk += 1;
  }

  return {
    id: dayKey,
    classId,
    teacherUid,
    dayKey,
    averageReadiness: Math.round(averageReadiness),
    averageConfidence: Number(averageConfidence.toFixed(2)),
    averageStudyMinutes: Math.round(averageStudyMinutes),
    plannerCompletionPct: Math.round(plannerCompletionPct),
    weakChapters,
    commonMistakes,
    segmentation: { onTrack, needsAttention, atRisk },
    generatedAt: Date.now(),
  };
}