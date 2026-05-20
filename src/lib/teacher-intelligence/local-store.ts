/**
 * Guest-mode mirror for the teacher dashboard — keeps the UX usable before
 * Firebase Auth is wired up.
 */
import type {
  ClassAnalyticsDoc,
  ClassAssignmentDoc,
  ClassInviteDoc,
  ClassRiskAlertDoc,
  ClassStudentDoc,
  TeacherClassDoc,
  TeacherInsightDoc,
} from "@/integrations/firebase/types";

const K = {
  CLASSES: "aura.teacher.classes.v1",
  STUDENTS: "aura.teacher.classStudents.v1",
  ASSIGNMENTS: "aura.teacher.assignments.v1",
  ANALYTICS: "aura.teacher.analytics.v1",
  RISK: "aura.teacher.risk.v1",
  INSIGHTS: "aura.teacher.insights.v1",
  INVITES: "aura.teacher.classInvites.v1",
} as const;

function read<T>(k: string, fb: T): T {
  if (typeof window === "undefined") return fb;
  try {
    const r = localStorage.getItem(k);
    return r ? (JSON.parse(r) as T) : fb;
  } catch {
    return fb;
  }
}
function write(k: string, v: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* quota */
  }
}

// Classes
export function readClassesLocal(teacherUid: string): TeacherClassDoc[] {
  return read<TeacherClassDoc[]>(K.CLASSES, []).filter((c) => c.teacherUid === teacherUid);
}
export function writeClassLocal(doc: TeacherClassDoc) {
  const all = read<TeacherClassDoc[]>(K.CLASSES, []).filter((c) => c.id !== doc.id);
  all.push(doc);
  write(K.CLASSES, all);
}
export function removeClassLocal(classId: string) {
  write(K.CLASSES, read<TeacherClassDoc[]>(K.CLASSES, []).filter((c) => c.id !== classId));
}

// Students
export function readClassStudentsLocal(classId: string): ClassStudentDoc[] {
  return read<ClassStudentDoc[]>(K.STUDENTS, []).filter((s) => s.classId === classId);
}
export function writeClassStudentLocal(doc: ClassStudentDoc) {
  const all = read<ClassStudentDoc[]>(K.STUDENTS, []).filter(
    (s) => !(s.classId === doc.classId && s.studentUid === doc.studentUid),
  );
  all.push(doc);
  write(K.STUDENTS, all);
}
export function removeClassStudentLocal(classId: string, studentUid: string) {
  write(
    K.STUDENTS,
    read<ClassStudentDoc[]>(K.STUDENTS, []).filter(
      (s) => !(s.classId === classId && s.studentUid === studentUid),
    ),
  );
}

// Assignments
export function readAssignmentsLocal(classId: string): ClassAssignmentDoc[] {
  return read<ClassAssignmentDoc[]>(K.ASSIGNMENTS, []).filter((a) => a.classId === classId);
}
export function writeAssignmentLocal(doc: ClassAssignmentDoc) {
  const all = read<ClassAssignmentDoc[]>(K.ASSIGNMENTS, []).filter((a) => a.id !== doc.id);
  all.push(doc);
  write(K.ASSIGNMENTS, all);
}

// Analytics
export function readAnalyticsLocal(classId: string): ClassAnalyticsDoc[] {
  return read<ClassAnalyticsDoc[]>(K.ANALYTICS, []).filter((a) => a.classId === classId);
}
export function writeAnalyticsLocal(doc: ClassAnalyticsDoc) {
  const all = read<ClassAnalyticsDoc[]>(K.ANALYTICS, []).filter(
    (a) => !(a.classId === doc.classId && a.id === doc.id),
  );
  all.push(doc);
  write(K.ANALYTICS, all);
}

// Risk
export function readRiskLocal(classId: string): ClassRiskAlertDoc[] {
  return read<ClassRiskAlertDoc[]>(K.RISK, []).filter((a) => a.classId === classId);
}
export function upsertRiskLocal(alerts: ClassRiskAlertDoc[]) {
  if (!alerts.length) return;
  const ids = new Set(alerts.map((a) => a.id));
  const all = read<ClassRiskAlertDoc[]>(K.RISK, []).filter((a) => !ids.has(a.id));
  write(K.RISK, all.concat(alerts).slice(-400));
}

// Insights
export function readInsightsLocal(classId: string): TeacherInsightDoc[] {
  return read<TeacherInsightDoc[]>(K.INSIGHTS, []).filter((a) => a.classId === classId);
}
export function upsertInsightsLocal(insights: TeacherInsightDoc[]) {
  if (!insights.length) return;
  const ids = new Set(insights.map((i) => i.id));
  const all = read<TeacherInsightDoc[]>(K.INSIGHTS, []).filter((i) => !ids.has(i.id));
  write(K.INSIGHTS, all.concat(insights).slice(-200));
}

// Invites
export function writeInviteLocal(doc: ClassInviteDoc) {
  const all = read<ClassInviteDoc[]>(K.INVITES, []).filter((i) => i.id !== doc.id);
  all.push(doc);
  write(K.INVITES, all);
}
export function readInviteLocal(code: string): ClassInviteDoc | null {
  return read<ClassInviteDoc[]>(K.INVITES, []).find((i) => i.id === code) ?? null;
}