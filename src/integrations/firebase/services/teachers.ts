/**
 * Firestore services for the Teacher Intelligence Dashboard.
 * Owner-gated by `teacherUid` via rules; admin overrides supported.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import {
  CLASS_SUBCOLLECTIONS,
  COLLECTIONS,
  TEACHER_SUBCOLLECTIONS,
  db,
} from "../config";
import type {
  ClassAnalyticsDoc,
  ClassAssignmentDoc,
  ClassInviteDoc,
  ClassRiskAlertDoc,
  ClassStudentDoc,
  TeacherClassDoc,
  TeacherClassMirrorDoc,
  TeacherDoc,
  TeacherInsightDoc,
} from "../types";

// ---------- Teacher root ----------
export async function ensureTeacherDoc(doc_: TeacherDoc): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.TEACHERS, doc_.teacherUid), doc_, { merge: true });
}
export async function fetchTeacherDoc(teacherUid: string): Promise<TeacherDoc | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.TEACHERS, teacherUid));
  return snap.exists() ? (snap.data() as TeacherDoc) : null;
}

// ---------- Classes ----------
const classDocRef = (classId: string) => doc(db, COLLECTIONS.CLASSES, classId);
const classSubCol = (classId: string, sub: string) =>
  collection(db, COLLECTIONS.CLASSES, classId, sub);
const classSubDoc = (classId: string, sub: string, id: string) =>
  doc(db, COLLECTIONS.CLASSES, classId, sub, id);

export async function createClass(cls: TeacherClassDoc): Promise<void> {
  const batch = writeBatch(db);
  batch.set(classDocRef(cls.classId), cls, { merge: true });
  const mirror: TeacherClassMirrorDoc = {
    id: cls.classId,
    classId: cls.classId,
    teacherUid: cls.teacherUid,
    name: cls.name,
    studentCount: cls.studentCount,
    createdAt: cls.createdAt,
  };
  batch.set(
    doc(db, COLLECTIONS.TEACHERS, cls.teacherUid, TEACHER_SUBCOLLECTIONS.CLASSES_MIRROR, cls.classId),
    mirror,
    { merge: true },
  );
  await batch.commit();
}

export async function fetchTeacherClasses(teacherUid: string): Promise<TeacherClassDoc[]> {
  const q = query(collection(db, COLLECTIONS.CLASSES), where("teacherUid", "==", teacherUid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as TeacherClassDoc);
}

export async function updateClass(cls: TeacherClassDoc): Promise<void> {
  await setDoc(classDocRef(cls.classId), cls, { merge: true });
}

// ---------- Students ----------
export async function upsertClassStudent(s: ClassStudentDoc): Promise<void> {
  await setDoc(
    classSubDoc(s.classId, CLASS_SUBCOLLECTIONS.STUDENTS, s.studentUid),
    s,
    { merge: true },
  );
}
export async function fetchClassStudents(classId: string): Promise<ClassStudentDoc[]> {
  const snap = await getDocs(classSubCol(classId, CLASS_SUBCOLLECTIONS.STUDENTS));
  return snap.docs.map((d) => d.data() as ClassStudentDoc);
}

// ---------- Assignments ----------
export async function writeAssignment(a: ClassAssignmentDoc): Promise<void> {
  await setDoc(classSubDoc(a.classId, CLASS_SUBCOLLECTIONS.ASSIGNMENTS, a.id), a, {
    merge: true,
  });
}
export async function fetchAssignments(classId: string): Promise<ClassAssignmentDoc[]> {
  const snap = await getDocs(classSubCol(classId, CLASS_SUBCOLLECTIONS.ASSIGNMENTS));
  return snap.docs.map((d) => d.data() as ClassAssignmentDoc);
}

// ---------- Analytics ----------
export async function writeClassAnalytics(a: ClassAnalyticsDoc): Promise<void> {
  await setDoc(classSubDoc(a.classId, CLASS_SUBCOLLECTIONS.ANALYTICS, a.id), a, {
    merge: true,
  });
}
export async function fetchClassAnalytics(classId: string): Promise<ClassAnalyticsDoc[]> {
  const snap = await getDocs(classSubCol(classId, CLASS_SUBCOLLECTIONS.ANALYTICS));
  return snap.docs.map((d) => d.data() as ClassAnalyticsDoc);
}

// ---------- Risk alerts ----------
export async function upsertRiskAlerts(alerts: ClassRiskAlertDoc[]): Promise<void> {
  if (!alerts.length) return;
  const batch = writeBatch(db);
  for (const a of alerts) {
    batch.set(classSubDoc(a.classId, CLASS_SUBCOLLECTIONS.RISK_ALERTS, a.id), a, {
      merge: true,
    });
  }
  await batch.commit();
}
export async function fetchRiskAlerts(classId: string): Promise<ClassRiskAlertDoc[]> {
  const snap = await getDocs(classSubCol(classId, CLASS_SUBCOLLECTIONS.RISK_ALERTS));
  return snap.docs.map((d) => d.data() as ClassRiskAlertDoc);
}
export async function acknowledgeRiskAlert(classId: string, alertId: string): Promise<void> {
  await setDoc(
    classSubDoc(classId, CLASS_SUBCOLLECTIONS.RISK_ALERTS, alertId),
    { acknowledged: true },
    { merge: true },
  );
}

// ---------- Insights ----------
export async function upsertInsights(insights: TeacherInsightDoc[]): Promise<void> {
  if (!insights.length) return;
  const batch = writeBatch(db);
  for (const i of insights) {
    batch.set(classSubDoc(i.classId, CLASS_SUBCOLLECTIONS.INSIGHTS, i.id), i, { merge: true });
  }
  await batch.commit();
}
export async function fetchInsights(classId: string): Promise<TeacherInsightDoc[]> {
  const snap = await getDocs(classSubCol(classId, CLASS_SUBCOLLECTIONS.INSIGHTS));
  return snap.docs.map((d) => d.data() as TeacherInsightDoc);
}

// ---------- Class invites ----------
export async function createClassInvite(invite: ClassInviteDoc): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.CLASS_INVITES, invite.code), invite);
}
export async function fetchClassInvite(code: string): Promise<ClassInviteDoc | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.CLASS_INVITES, code));
  return snap.exists() ? (snap.data() as ClassInviteDoc) : null;
}