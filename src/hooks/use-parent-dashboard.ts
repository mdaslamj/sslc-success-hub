/**
 * Parent dashboard hook. Builds a calm, supportive snapshot for the parent
 * view by stitching together what we have today: linked students (from
 * Firestore or local-store mirror), a synthesized student snapshot, derived
 * alerts, and weekly reports.
 *
 * Until cross-user reads are wired through a server function or per-student
 * "publicSummary" doc, the student snapshot is sourced from a deterministic
 * synthesizer in the hook so the parent UX is usable today. All call sites
 * accept the same `StudentSnapshot` shape, so swapping to live data later
 * is a one-place change.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthOptional } from "@/contexts/auth-context";
import { useCurrentUserId } from "./use-current-user";
import { toDayKey } from "@/integrations/firebase/services/analytics";
import {
  generateParentAlerts,
  buildWeeklyReport,
  generateInviteCode,
  normalizeInviteCode,
  isValidInviteCode,
  weekKeyOf,
  type StudentSnapshot,
} from "@/lib/parent-intelligence";
import {
  readAlertsLocal,
  upsertAlertsLocal,
  readLinkedStudentsLocal,
  writeLinkedStudentLocal,
  readReportsLocal,
  writeReportLocal,
  readInvitesLocal,
  writeInviteLocal,
  consumeInviteLocal,
  writeLinkLocal,
  readLinksLocal,
  appendEngagementLocal,
} from "@/lib/parent-intelligence/local-store";
import {
  createStudentInvite,
  fetchStudentInvite,
  consumeInvite,
  createParentLink,
  upsertLinkedStudent,
  fetchLinkedStudents,
  fetchParentAlerts,
  upsertParentAlerts,
  markAlertRead,
  fetchWeeklyReports,
  writeWeeklyReport,
  appendEngagement,
  fetchInvitesForStudent,
  ensureParentDoc,
} from "@/integrations/firebase/services/parents";
import type {
  LinkedStudentDoc,
  ParentAlertDoc,
  ParentLinkDoc,
  ParentWeeklyReportDoc,
  StudentInviteDoc,
} from "@/integrations/firebase/types";
import { subjects as mockSubjects } from "@/lib/mock-data";

function rid(p: string) {
  return `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/** Deterministic synthesized snapshot keyed off student name + uid. */
function synthesizeStudentSnapshot(
  studentUid: string,
  studentName: string,
): StudentSnapshot {
  const weak = [...mockSubjects].sort((a, b) => a.mastery - b.mastery).slice(0, 3);
  return {
    studentUid,
    studentName,
    todayMinutes: 42,
    weeklyMinutes: 260,
    plannerCompletionPct: 68,
    revisionDue: 4,
    daysSinceRevision: 2,
    averageConfidence: 3.4,
    confidenceTrend: 0.08,
    boardReadiness: 71,
    readinessDelta: 3,
    streakCurrent: 5,
    weakSubjects: weak.map((s) => ({ id: s.id, name: s.name, mastery: s.mastery })),
    recentRecoveries: [{ conceptLabel: "Quadratic equations", delta: 12 }],
    lastStudiedAt: Date.now() - 3 * 3600_000,
  };
}

export type ParentDashboardState = {
  loading: boolean;
  parentUid: string;
  isAuthed: boolean;
  linkedStudents: LinkedStudentDoc[];
  activeStudent: LinkedStudentDoc | null;
  snapshot: StudentSnapshot | null;
  alerts: ParentAlertDoc[];
  unreadAlerts: number;
  latestReport: ParentWeeklyReportDoc | null;
  reports: ParentWeeklyReportDoc[];
  setActiveStudent: (studentUid: string) => void;
  linkWithCode: (rawCode: string, studentName?: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  markAlertRead: (alertId: string) => Promise<void>;
  regenerateAlerts: () => Promise<void>;
  regenerateWeeklyReport: () => Promise<void>;
};

export function useParentDashboard(): ParentDashboardState {
  const authCtx = useAuthOptional();
  const isAuthed = Boolean(authCtx?.user?.uid);
  const parentUid = useCurrentUserId();
  const dayKey = toDayKey(new Date());

  const [linked, setLinked] = useState<LinkedStudentDoc[]>([]);
  const [alerts, setAlerts] = useState<ParentAlertDoc[]>([]);
  const [reports, setReports] = useState<ParentWeeklyReportDoc[]>([]);
  const [activeStudentUid, setActiveStudentUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Hydrate
  useEffect(() => {
    let alive = true;
    if (!parentUid) return;
    (async () => {
      try {
        if (isAuthed) {
          await ensureParentDoc({
            id: parentUid,
            parentUid,
            displayName: authCtx?.user?.displayName ?? undefined,
            email: authCtx?.user?.email ?? undefined,
            notificationOptIn: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }).catch(() => undefined);
          const [ls, al, rp] = await Promise.all([
            fetchLinkedStudents(parentUid).catch(() => []),
            fetchParentAlerts(parentUid).catch(() => []),
            fetchWeeklyReports(parentUid).catch(() => []),
          ]);
          if (!alive) return;
          setLinked(ls);
          setAlerts(al);
          setReports(rp);
        } else {
          setLinked(readLinkedStudentsLocal(parentUid));
          setAlerts(readAlertsLocal(parentUid));
          setReports(readReportsLocal(parentUid));
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [parentUid, isAuthed, authCtx?.user?.displayName, authCtx?.user?.email]);

  // Default active student = first
  useEffect(() => {
    if (!activeStudentUid && linked.length) setActiveStudentUid(linked[0].studentUid);
  }, [linked, activeStudentUid]);

  const activeStudent = useMemo(
    () => linked.find((l) => l.studentUid === activeStudentUid) ?? null,
    [linked, activeStudentUid],
  );

  const snapshot = useMemo<StudentSnapshot | null>(
    () => (activeStudent ? synthesizeStudentSnapshot(activeStudent.studentUid, activeStudent.studentName ?? "your child") : null),
    [activeStudent],
  );

  // Auto-generate today's alerts when we have a snapshot.
  useEffect(() => {
    if (!snapshot || !parentUid) return;
    const existing = alerts.filter((a) => a.dayKey === dayKey && a.studentUid === snapshot.studentUid);
    if (existing.length) return;
    const fresh = generateParentAlerts({ parentUid, student: snapshot, dayKey });
    if (!fresh.length) return;
    setAlerts((prev) => [...prev, ...fresh]);
    if (isAuthed) void upsertParentAlerts(fresh).catch(() => undefined);
    else upsertAlertsLocal(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot, parentUid, dayKey]);

  // Ensure current week's report exists.
  useEffect(() => {
    if (!snapshot || !parentUid) return;
    const wk = weekKeyOf();
    if (reports.some((r) => r.id === wk && r.studentUid === snapshot.studentUid)) return;
    const report = buildWeeklyReport({
      parentUid,
      student: snapshot,
      subjects: mockSubjects.map((s) => ({ id: s.id, name: s.name, mastery: s.mastery })),
      weakChapters: snapshot.weakSubjects.slice(0, 3).map((s, i) => ({
        subject: s.name,
        chapter: `${s.name} chapter ${i + 1}`,
        mastery: s.mastery,
      })),
      mockExamsAttempted: 1,
    });
    setReports((prev) => [...prev.filter((r) => r.id !== wk), report]);
    if (isAuthed) void writeWeeklyReport(report).catch(() => undefined);
    else writeReportLocal(report);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot, parentUid]);

  const linkWithCode = useCallback(
    async (rawCode: string, studentName?: string): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (!parentUid) return { ok: false, error: "Not signed in" };
      const code = normalizeInviteCode(rawCode);
      if (!isValidInviteCode(code)) return { ok: false, error: "Code should be 8 letters/numbers." };
      let invite: StudentInviteDoc | null = null;
      if (isAuthed) {
        invite = await fetchStudentInvite(code).catch(() => null);
      } else {
        invite = readInvitesLocal(code).find((i) => i.id === code) ?? null;
      }
      if (!invite) return { ok: false, error: "We couldn't find that code." };
      if (invite.used) return { ok: false, error: "This code has already been used." };
      if (invite.expiresAt < Date.now()) return { ok: false, error: "This code has expired." };

      const linkId = `${parentUid}_${invite.studentUid}`;
      const link: ParentLinkDoc = {
        id: linkId,
        parentUid,
        studentUid: invite.studentUid,
        inviteCode: code,
        status: "active",
        createdAt: Date.now(),
      };
      const linked: LinkedStudentDoc = {
        id: invite.studentUid,
        parentUid,
        studentUid: invite.studentUid,
        studentName: studentName ?? invite.studentName,
        status: "active",
        linkedAt: Date.now(),
      };

      if (isAuthed) {
        await Promise.all([
          createParentLink(link).catch(() => undefined),
          consumeInvite(code, parentUid).catch(() => undefined),
          upsertLinkedStudent(linked).catch(() => undefined),
          appendEngagement({
            id: rid("eng"),
            parentUid,
            studentUid: invite.studentUid,
            kind: "linked_student",
            dayKey,
            createdAt: Date.now(),
          }).catch(() => undefined),
        ]);
      } else {
        writeLinkLocal(link);
        consumeInviteLocal(code, parentUid);
        writeLinkedStudentLocal(linked);
        appendEngagementLocal({
          id: rid("eng"),
          parentUid,
          studentUid: invite.studentUid,
          kind: "linked_student",
          dayKey,
          createdAt: Date.now(),
        });
      }
      setLinked((prev) => [...prev.filter((l) => l.studentUid !== linked.studentUid), linked]);
      setActiveStudentUid(linked.studentUid);
      return { ok: true };
    },
    [parentUid, isAuthed, dayKey],
  );

  const markRead = useCallback(
    async (alertId: string) => {
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, read: true } : a)));
      if (isAuthed) await markAlertRead(parentUid, alertId).catch(() => undefined);
      else {
        const next = alerts.map((a) => (a.id === alertId ? { ...a, read: true } : a));
        upsertAlertsLocal(next.filter((a) => a.id === alertId));
      }
    },
    [parentUid, isAuthed, alerts],
  );

  const regenerateAlerts = useCallback(async () => {
    if (!snapshot || !parentUid) return;
    const fresh = generateParentAlerts({ parentUid, student: snapshot, dayKey });
    setAlerts((prev) => [...prev.filter((a) => a.dayKey !== dayKey), ...fresh]);
    if (isAuthed) await upsertParentAlerts(fresh).catch(() => undefined);
    else upsertAlertsLocal(fresh);
  }, [snapshot, parentUid, dayKey, isAuthed]);

  const regenerateWeeklyReport = useCallback(async () => {
    if (!snapshot || !parentUid) return;
    const report = buildWeeklyReport({
      parentUid,
      student: snapshot,
      subjects: mockSubjects.map((s) => ({ id: s.id, name: s.name, mastery: s.mastery })),
      weakChapters: snapshot.weakSubjects.slice(0, 3).map((s, i) => ({
        subject: s.name,
        chapter: `${s.name} chapter ${i + 1}`,
        mastery: s.mastery,
      })),
      mockExamsAttempted: 1,
    });
    setReports((prev) => [...prev.filter((r) => r.id !== report.id), report]);
    if (isAuthed) await writeWeeklyReport(report).catch(() => undefined);
    else writeReportLocal(report);
  }, [snapshot, parentUid, isAuthed]);

  const latestReport = useMemo(
    () =>
      reports
        .filter((r) => !activeStudent || r.studentUid === activeStudent.studentUid)
        .sort((a, b) => b.generatedAt - a.generatedAt)[0] ?? null,
    [reports, activeStudent],
  );

  const visibleAlerts = useMemo(
    () =>
      alerts
        .filter((a) => !activeStudent || a.studentUid === activeStudent.studentUid)
        .sort((a, b) => b.createdAt - a.createdAt),
    [alerts, activeStudent],
  );

  return {
    loading,
    parentUid,
    isAuthed,
    linkedStudents: linked,
    activeStudent,
    snapshot,
    alerts: visibleAlerts,
    unreadAlerts: visibleAlerts.filter((a) => !a.read).length,
    latestReport,
    reports,
    setActiveStudent: (uid) => setActiveStudentUid(uid),
    linkWithCode,
    markAlertRead: markRead,
    regenerateAlerts,
    regenerateWeeklyReport,
  };
}

// -----------------------------------------------------------------------------
// Student-side hook: issue invite codes for parents to claim.
// -----------------------------------------------------------------------------

export function useStudentInviteCodes() {
  const authCtx = useAuthOptional();
  const isAuthed = Boolean(authCtx?.user?.uid);
  const studentUid = useCurrentUserId();
  const [invites, setInvites] = useState<StudentInviteDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!studentUid) return;
    (async () => {
      try {
        if (isAuthed) {
          const list = await fetchInvitesForStudent(studentUid).catch(() => []);
          if (!alive) return;
          setInvites(list);
        } else {
          setInvites(readInvitesLocal(studentUid));
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [studentUid, isAuthed]);

  const createInvite = useCallback(async () => {
    if (!studentUid) return null;
    const code = generateInviteCode();
    const doc: StudentInviteDoc = {
      id: code,
      code,
      studentUid,
      studentName: authCtx?.user?.displayName ?? undefined,
      expiresAt: Date.now() + 14 * 86400_000,
      used: false,
      createdAt: Date.now(),
    };
    if (isAuthed) await createStudentInvite(doc).catch(() => undefined);
    else writeInviteLocal(doc);
    setInvites((prev) => [...prev, doc]);
    return doc;
  }, [studentUid, isAuthed, authCtx?.user?.displayName]);

  return { loading, invites, createInvite };
}