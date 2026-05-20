/**
 * Class-level AI teaching insights. Derives weak-concept, repeated-mistake,
 * remediation-priority, and chapter-intervention recommendations from a
 * roster of student summaries.
 */
import type {
  TeacherInsightDoc,
  TeacherStudentSummary,
} from "@/integrations/firebase/types";

export type RosterEntry = {
  studentUid: string;
  studentName?: string;
  summary: TeacherStudentSummary;
};

export type GenerateInsightsInput = {
  classId: string;
  teacherUid: string;
  roster: RosterEntry[];
  dayKey: string;
};

function pushInsight(
  out: TeacherInsightDoc[],
  base: Omit<TeacherInsightDoc, "id" | "createdAt">,
) {
  out.push({
    ...base,
    id: `${base.dayKey}_${base.kind}_${base.suggestedChapterId ?? base.title.slice(0, 16)}`
      .replace(/\s+/g, "_")
      .toLowerCase(),
    createdAt: Date.now(),
  });
}

export function generateClassInsights(
  input: GenerateInsightsInput,
): TeacherInsightDoc[] {
  const { classId, teacherUid, roster, dayKey } = input;
  const out: TeacherInsightDoc[] = [];
  if (!roster.length) return out;

  // 1. Tally weakest subjects across the class.
  const subjectTally = new Map<string, { name: string; total: number; affected: number }>();
  for (const r of roster) {
    for (const w of r.summary.weakSubjects) {
      if (w.mastery >= 55) continue;
      const t = subjectTally.get(w.id) ?? { name: w.name, total: 0, affected: 0 };
      t.total += w.mastery;
      t.affected += 1;
      subjectTally.set(w.id, t);
    }
  }
  const ranked = [...subjectTally.entries()]
    .map(([id, v]) => ({ id, ...v, avg: v.total / Math.max(v.affected, 1) }))
    .sort((a, b) => b.affected - a.affected || a.avg - b.avg);

  if (ranked[0] && ranked[0].affected >= Math.max(2, Math.ceil(roster.length * 0.25))) {
    const top = ranked[0];
    pushInsight(out, {
      classId,
      teacherUid,
      kind: "weak_concept",
      title: `${top.name} is the class-wide focus area`,
      body: `${top.affected} of ${roster.length} students sit below 55% mastery in ${top.name} (avg ${Math.round(top.avg)}%).`,
      affectedStudents: top.affected,
      suggestedAssignmentKind: "chapter_practice",
      suggestedChapterId: top.id,
      dayKey,
    });
  }

  // 2. Repeated mistakes — proxy from second weakest subject.
  if (ranked[1] && ranked[1].affected >= 2) {
    const second = ranked[1];
    pushInsight(out, {
      classId,
      teacherUid,
      kind: "repeated_mistake",
      title: `Recurring slips in ${second.name}`,
      body: `${second.affected} students keep stumbling in ${second.name}. A targeted drill could move the needle this week.`,
      affectedStudents: second.affected,
      suggestedAssignmentKind: "formula_drill",
      suggestedChapterId: second.id,
      dayKey,
    });
  }

  // 3. Remediation priority — students with low readiness AND low confidence.
  const atRisk = roster.filter(
    (r) => r.summary.boardReadiness < 55 && r.summary.averageConfidence < 3.0,
  );
  if (atRisk.length >= 2) {
    pushInsight(out, {
      classId,
      teacherUid,
      kind: "remediation_priority",
      title: `${atRisk.length} students need a 1:1 check-in`,
      body: `Readiness < 55% AND confidence < 3.0 — small group session this week will help most.`,
      affectedStudents: atRisk.length,
      suggestedAssignmentKind: "revision_task",
      dayKey,
    });
  }

  // 4. Chapter intervention — recommend a mock if class avg readiness slipping.
  const avgReadiness =
    roster.reduce((s, r) => s + r.summary.boardReadiness, 0) / roster.length;
  if (avgReadiness < 65) {
    pushInsight(out, {
      classId,
      teacherUid,
      kind: "chapter_intervention",
      title: "Schedule a calibration mock",
      body: `Class average readiness is ${Math.round(avgReadiness)}%. A short mock will surface where to focus next.`,
      affectedStudents: roster.length,
      suggestedAssignmentKind: "mock_exam",
      dayKey,
    });
  }

  return out;
}