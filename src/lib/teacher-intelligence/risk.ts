/**
 * Student risk engine — flags inactivity, burnout, low confidence, marks at
 * risk, and consistency decline. Designed to be calm but actionable for
 * teachers (suggestedAction always present).
 */
import type {
  ClassRiskAlertDoc,
  TeacherRiskKind,
  TeacherRiskSeverity,
  TeacherStudentSummary,
} from "@/integrations/firebase/types";

export type RiskInput = {
  classId: string;
  teacherUid: string;
  studentUid: string;
  studentName?: string;
  summary: TeacherStudentSummary;
  dayKey: string;
};

function make(
  i: RiskInput,
  kind: TeacherRiskKind,
  severity: TeacherRiskSeverity,
  title: string,
  body: string,
  suggestedAction?: string,
): ClassRiskAlertDoc {
  return {
    id: `${i.dayKey}_${kind}_${i.studentUid}`,
    classId: i.classId,
    teacherUid: i.teacherUid,
    studentUid: i.studentUid,
    studentName: i.studentName,
    kind,
    severity,
    title,
    body,
    suggestedAction,
    acknowledged: false,
    dayKey: i.dayKey,
    createdAt: Date.now(),
  };
}

export function detectStudentRisks(i: RiskInput): ClassRiskAlertDoc[] {
  const out: ClassRiskAlertDoc[] = [];
  const s = i.summary;
  const name = i.studentName ?? "Student";

  // Inactivity — no study session in last 3 days.
  const lastStudied = s.lastStudiedAt ?? 0;
  const daysSince = lastStudied ? (Date.now() - lastStudied) / 86400_000 : 99;
  if (daysSince >= 3) {
    out.push(
      make(
        i,
        "inactivity",
        daysSince >= 7 ? "critical" : "warning",
        `${name} hasn't logged study in ${Math.floor(daysSince)} days`,
        `Last activity was ${Math.floor(daysSince)} days ago.`,
        "Send a check-in message or assign a 15-min light revision.",
      ),
    );
  }

  // Burnout — very high study load AND low confidence (overworked).
  if (s.weeklyMinutes > 900 && s.averageConfidence < 3.0) {
    out.push(
      make(
        i,
        "burnout",
        "warning",
        `${name} may be over-exerting`,
        `Logged ${Math.round(s.weeklyMinutes / 60)}h this week with confidence still at ${s.averageConfidence.toFixed(1)}.`,
        "Suggest a short break + revisit weakest chapter calmly.",
      ),
    );
  }

  // Low confidence.
  if (s.averageConfidence < 2.7) {
    out.push(
      make(
        i,
        "low_confidence",
        "warning",
        `${name} reporting low confidence`,
        `Self-rated confidence at ${s.averageConfidence.toFixed(1)} / 5.`,
        "Pair with a strong peer or a 1:1 doubt session.",
      ),
    );
  }

  // Marks-at-risk — readiness < 50%.
  if (s.boardReadiness < 50) {
    out.push(
      make(
        i,
        "marks_at_risk",
        s.boardReadiness < 35 ? "critical" : "warning",
        `${name} tracking below pass-band`,
        `Predicted board readiness ${Math.round(s.boardReadiness)}%.`,
        "Build a 2-week recovery plan focused on weakest 2 chapters.",
      ),
    );
  }

  // Consistency decline — broken streak under 2 days + low planner completion.
  if (s.streakCurrent <= 1 && s.plannerCompletionPct < 40) {
    out.push(
      make(
        i,
        "consistency_decline",
        "info",
        `${name}'s consistency is slipping`,
        `Streak ${s.streakCurrent}d, planner completion ${s.plannerCompletionPct}%.`,
        "Send an encouraging note — small wins restart streaks fast.",
      ),
    );
  }

  return out;
}