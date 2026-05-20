/**
 * Firestore services for the Parent Intelligence Dashboard.
 * Owner-gated by `parentUid` via rules; admin overrides supported.
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
import { COLLECTIONS, PARENT_SUBCOLLECTIONS, db } from "../config";
import type {
  LinkedStudentDoc,
  ParentAlertDoc,
  ParentDoc,
  ParentEngagementDoc,
  ParentLinkDoc,
  ParentWeeklyReportDoc,
  StudentInviteDoc,
} from "../types";

const parentCol = (parentUid: string, sub: string) =>
  collection(db, COLLECTIONS.PARENTS, parentUid, sub);
const parentDocRef = (parentUid: string, sub: string, id: string) =>
  doc(db, COLLECTIONS.PARENTS, parentUid, sub, id);

// ---------- Parent root ----------
export async function ensureParentDoc(input: ParentDoc): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.PARENTS, input.parentUid), input, { merge: true });
}
export async function fetchParentDoc(parentUid: string): Promise<ParentDoc | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.PARENTS, parentUid));
  return snap.exists() ? (snap.data() as ParentDoc) : null;
}

// ---------- Linked students ----------
export async function upsertLinkedStudent(doc: LinkedStudentDoc): Promise<void> {
  await setDoc(
    parentDocRef(doc.parentUid, PARENT_SUBCOLLECTIONS.LINKED_STUDENTS, doc.studentUid),
    doc,
    { merge: true },
  );
}
export async function fetchLinkedStudents(parentUid: string): Promise<LinkedStudentDoc[]> {
  const snap = await getDocs(parentCol(parentUid, PARENT_SUBCOLLECTIONS.LINKED_STUDENTS));
  return snap.docs.map((d) => d.data() as LinkedStudentDoc);
}

// ---------- Alerts ----------
export async function upsertParentAlerts(alerts: ParentAlertDoc[]): Promise<void> {
  if (!alerts.length) return;
  const batch = writeBatch(db);
  for (const a of alerts) {
    batch.set(parentDocRef(a.parentUid, PARENT_SUBCOLLECTIONS.ALERTS, a.id), a, { merge: true });
  }
  await batch.commit();
}
export async function fetchParentAlerts(parentUid: string): Promise<ParentAlertDoc[]> {
  const snap = await getDocs(parentCol(parentUid, PARENT_SUBCOLLECTIONS.ALERTS));
  return snap.docs.map((d) => d.data() as ParentAlertDoc);
}
export async function markAlertRead(parentUid: string, alertId: string): Promise<void> {
  await setDoc(
    parentDocRef(parentUid, PARENT_SUBCOLLECTIONS.ALERTS, alertId),
    { read: true },
    { merge: true },
  );
}

// ---------- Weekly reports ----------
export async function writeWeeklyReport(report: ParentWeeklyReportDoc): Promise<void> {
  await setDoc(
    parentDocRef(report.parentUid, PARENT_SUBCOLLECTIONS.WEEKLY_REPORTS, report.id),
    report,
    { merge: true },
  );
}
export async function fetchWeeklyReports(parentUid: string): Promise<ParentWeeklyReportDoc[]> {
  const snap = await getDocs(parentCol(parentUid, PARENT_SUBCOLLECTIONS.WEEKLY_REPORTS));
  return snap.docs.map((d) => d.data() as ParentWeeklyReportDoc);
}

// ---------- Engagement ----------
export async function appendEngagement(evt: ParentEngagementDoc): Promise<void> {
  await setDoc(
    parentDocRef(evt.parentUid, PARENT_SUBCOLLECTIONS.ENGAGEMENT_HISTORY, evt.id),
    evt,
  );
}

// ---------- Invites + links ----------
export async function createStudentInvite(invite: StudentInviteDoc): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.STUDENT_INVITES, invite.code), invite);
}
export async function fetchStudentInvite(code: string): Promise<StudentInviteDoc | null> {
  const snap = await getDoc(doc(db, COLLECTIONS.STUDENT_INVITES, code));
  return snap.exists() ? (snap.data() as StudentInviteDoc) : null;
}
export async function fetchInvitesForStudent(studentUid: string): Promise<StudentInviteDoc[]> {
  const q = query(
    collection(db, COLLECTIONS.STUDENT_INVITES),
    where("studentUid", "==", studentUid),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as StudentInviteDoc);
}
export async function consumeInvite(code: string, parentUid: string): Promise<void> {
  await setDoc(
    doc(db, COLLECTIONS.STUDENT_INVITES, code),
    { used: true, usedByParentUid: parentUid },
    { merge: true },
  );
}
export async function createParentLink(link: ParentLinkDoc): Promise<void> {
  await setDoc(doc(db, COLLECTIONS.PARENT_LINKS, link.id), link);
}
export async function fetchParentLinksForParent(parentUid: string): Promise<ParentLinkDoc[]> {
  const q = query(
    collection(db, COLLECTIONS.PARENT_LINKS),
    where("parentUid", "==", parentUid),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as ParentLinkDoc);
}
export async function fetchParentLinksForStudent(studentUid: string): Promise<ParentLinkDoc[]> {
  const q = query(
    collection(db, COLLECTIONS.PARENT_LINKS),
    where("studentUid", "==", studentUid),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as ParentLinkDoc);
}