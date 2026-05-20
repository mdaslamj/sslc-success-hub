/**
 * Guest-mode mirror for parent intelligence — lets the dashboard work
 * before Firebase Auth is wired (or for parents previewing the UX).
 */
import type {
  LinkedStudentDoc,
  ParentAlertDoc,
  ParentEngagementDoc,
  ParentLinkDoc,
  ParentWeeklyReportDoc,
  StudentInviteDoc,
} from "@/integrations/firebase/types";

const K = {
  INVITES: "aura.parent.invites.v1",
  LINKS: "aura.parent.links.v1",
  LINKED: "aura.parent.linkedStudents.v1",
  ALERTS: "aura.parent.alerts.v1",
  REPORTS: "aura.parent.reports.v1",
  ENGAGEMENT: "aura.parent.engagement.v1",
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

// Invites
export function readInvitesLocal(studentUid: string): StudentInviteDoc[] {
  return read<StudentInviteDoc[]>(K.INVITES, []).filter((i) => i.studentUid === studentUid);
}
export function writeInviteLocal(doc: StudentInviteDoc) {
  const all = read<StudentInviteDoc[]>(K.INVITES, []).filter((i) => i.id !== doc.id);
  all.push(doc);
  write(K.INVITES, all);
}
export function consumeInviteLocal(code: string, parentUid: string): StudentInviteDoc | null {
  const all = read<StudentInviteDoc[]>(K.INVITES, []);
  const idx = all.findIndex((i) => i.id === code && !i.used);
  if (idx < 0) return null;
  all[idx] = { ...all[idx], used: true, usedByParentUid: parentUid };
  write(K.INVITES, all);
  return all[idx];
}

// Links
export function writeLinkLocal(doc: ParentLinkDoc) {
  const all = read<ParentLinkDoc[]>(K.LINKS, []).filter((l) => l.id !== doc.id);
  all.push(doc);
  write(K.LINKS, all);
}
export function readLinksLocal(parentUid: string): ParentLinkDoc[] {
  return read<ParentLinkDoc[]>(K.LINKS, []).filter((l) => l.parentUid === parentUid);
}

// Linked students (mirror)
export function writeLinkedStudentLocal(doc: LinkedStudentDoc) {
  const all = read<LinkedStudentDoc[]>(K.LINKED, []).filter(
    (l) => !(l.parentUid === doc.parentUid && l.studentUid === doc.studentUid),
  );
  all.push(doc);
  write(K.LINKED, all);
}
export function readLinkedStudentsLocal(parentUid: string): LinkedStudentDoc[] {
  return read<LinkedStudentDoc[]>(K.LINKED, []).filter((l) => l.parentUid === parentUid);
}

// Alerts
export function readAlertsLocal(parentUid: string): ParentAlertDoc[] {
  return read<ParentAlertDoc[]>(K.ALERTS, []).filter((a) => a.parentUid === parentUid);
}
export function upsertAlertsLocal(alerts: ParentAlertDoc[]) {
  if (!alerts.length) return;
  const all = read<ParentAlertDoc[]>(K.ALERTS, []);
  const ids = new Set(alerts.map((a) => a.id));
  write(K.ALERTS, all.filter((a) => !ids.has(a.id)).concat(alerts).slice(-200));
}

// Reports
export function readReportsLocal(parentUid: string): ParentWeeklyReportDoc[] {
  return read<ParentWeeklyReportDoc[]>(K.REPORTS, []).filter((r) => r.parentUid === parentUid);
}
export function writeReportLocal(doc: ParentWeeklyReportDoc) {
  const all = read<ParentWeeklyReportDoc[]>(K.REPORTS, []).filter((r) => r.id !== doc.id);
  all.push(doc);
  write(K.REPORTS, all);
}

// Engagement
export function appendEngagementLocal(doc: ParentEngagementDoc) {
  const all = read<ParentEngagementDoc[]>(K.ENGAGEMENT, []);
  all.push(doc);
  write(K.ENGAGEMENT, all.slice(-200));
}
export function readEngagementLocal(parentUid: string): ParentEngagementDoc[] {
  return read<ParentEngagementDoc[]>(K.ENGAGEMENT, []).filter((e) => e.parentUid === parentUid);
}