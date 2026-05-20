/**
 * Teacher dashboard hook. Stitches together classes, roster, analytics,
 * insights, risk alerts, and assignment creation — Firestore-backed when
 * the user is signed in, localStorage-mirrored otherwise so the UX is
 * fully usable today.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthOptional } from "@/contexts/auth-context";
import { useCurrentUserId } from "./use-current-user";
import { toDayKey } from "@/integrations/firebase/services/analytics";
import {
  ASSIGNMENT_PRESETS,
  aggregateClassAnalytics,
  buildAssignment,
  detectStudentRisks,
  generateClassInsights,
  generateClassInviteCode,
  readAnalyticsLocal,
  readAssignmentsLocal,
  readClassesLocal,
  readClassStudentsLocal,
  readInsightsLocal,
  readRiskLocal,
  upsertInsightsLocal,
  upsertRiskLocal,
  writeAnalyticsLocal,
  writeAssignmentLocal,
  writeClassLocal,
  writeClassStudentLocal,
  writeInviteLocal,
} from "@/lib/teacher-intelligence";
import {
  acknowledgeRiskAlert,
  createClass,
  createClassInvite,
  ensureTeacherDoc,
  fetchAssignments,
  fetchClassAnalytics,
  fetchClassStudents,
  fetchInsights,
  fetchRiskAlerts,
  fetchTeacherClasses,
  upsertInsights,
  upsertRiskAlerts,
  writeAssignment,
  writeClassAnalytics,
} from "@/integrations/firebase/services/teachers";
import type {
  AssignmentKind,
  ClassAnalyticsDoc,
  ClassAssignmentDoc,
  ClassRiskAlertDoc,
  ClassStudentDoc,
  TeacherClassDoc,
  TeacherInsightDoc,
  TeacherStudentSummary,
} from "@/integrations/firebase/types";
import { subjects as mockSubjects } from "@/lib/mock-data";

function rid(p: string) {
  return `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/** Deterministic mock student summary keyed off uid so the demo feels real. */
function synthesizeStudentSummary(uid: string): TeacherStudentSummary {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0;
  const r = (n: number, span: number) => n + (h % span);
  const weakSorted = [...mockSubjects].sort((a, b) => a.mastery - b.mastery);
  return {
    weeklyMinutes: r(120, 800),
    plannerCompletionPct: r(35, 60),
    averageConfidence: 2.4 + ((h >> 3) % 26) / 10,
    boardReadiness: r(40, 50),
    streakCurrent: (h >> 5) % 12,
    weakSubjects: weakSorted.slice(0, 3).map((s) => ({
      id: s.id,
      name: s.name,
      mastery: Math.max(20, s.mastery - ((h >> 7) % 25)),
    })),
    lastStudiedAt: Date.now() - (((h >> 11) % 7) + 1) * 86400_000,
  };
}

/** Three seed students so a fresh class isn't empty. */
function seedRoster(classId: string): ClassStudentDoc[] {
  const seeds = [
    { uid: `seed_${classId}_aarav`, name: "Aarav Iyer", roll: "01" },
    { uid: `seed_${classId}_neha`, name: "Neha Pai", roll: "02" },
    { uid: `seed_${classId}_rohan`, name: "Rohan Shetty", roll: "03" },
  ];
  return seeds.map((s) => ({
    id: s.uid,
    classId,
    studentUid: s.uid,
    studentName: s.name,
    rollNo: s.roll,
    status: "active" as const,
    joinedAt: Date.now(),
    lastSummary: synthesizeStudentSummary(s.uid),
  }));
}

export type TeacherDashboardState = {
  loading: boolean;
  teacherUid: string;
  isAuthed: boolean;
  classes: TeacherClassDoc[];
  activeClass: TeacherClassDoc | null;
  students: ClassStudentDoc[];
  analytics: ClassAnalyticsDoc | null;
  insights: TeacherInsightDoc[];
  riskAlerts: ClassRiskAlertDoc[];
  assignments: ClassAssignmentDoc[];
  unacknowledgedRisk: number;
  setActiveClass: (classId: string) => void;
  createNewClass: (
    name: string,
    opts?: { school?: string; section?: string; batch?: string; grade?: string },
  ) => Promise<TeacherClassDoc | null>;
  refreshInsights: () => Promise<void>;
  acknowledgeRisk: (alertId: string) => Promise<void>;
  createAssignment: (input: {
    kind: AssignmentKind;
    title?: string;
    description?: string;
    subjectId?: string;
    chapterId?: string;
    dueAt?: number;
  }) => Promise<ClassAssignmentDoc | null>;
};

export function useTeacherDashboard(): TeacherDashboardState {
  const authCtx = useAuthOptional();
  const isAuthed = Boolean(authCtx?.user?.uid);
  const teacherUid = useCurrentUserId();
  const dayKey = toDayKey(new Date());

  const [classes, setClasses] = useState<TeacherClassDoc[]>([]);
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [students, setStudents] = useState<ClassStudentDoc[]>([]);
  const [analytics, setAnalytics] = useState<ClassAnalyticsDoc | null>(null);
  const [insights, setInsights] = useState<TeacherInsightDoc[]>([]);
  const [riskAlerts, setRiskAlerts] = useState<ClassRiskAlertDoc[]>([]);
  const [assignments, setAssignments] = useState<ClassAssignmentDoc[]>([]);
  const [loading, setLoading] = useState(true);

  // Hydrate classes for the teacher.
  useEffect(() => {
    let alive = true;
    if (!teacherUid) return;
    (async () => {
      try {
        if (isAuthed) {
          await ensureTeacherDoc({
            id: teacherUid,
            teacherUid,
            displayName: authCtx?.user?.displayName ?? undefined,
            email: authCtx?.user?.email ?? undefined,
            notificationOptIn: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }).catch(() => undefined);
          const list = await fetchTeacherClasses(teacherUid).catch(() => []);
          if (!alive) return;
          setClasses(list);
        } else {
          setClasses(readClassesLocal(teacherUid));
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [teacherUid, isAuthed, authCtx?.user?.displayName, authCtx?.user?.email]);

  // Default active class.
  useEffect(() => {
    if (!activeClassId && classes.length) setActiveClassId(classes[0].classId);
  }, [classes, activeClassId]);

  // Hydrate per-class data when active class changes.
  useEffect(() => {
    let alive = true;
    if (!activeClassId) {
      setStudents([]);
      setAnalytics(null);
      setInsights([]);
      setRiskAlerts([]);
      setAssignments([]);
      return;
    }
    (async () => {
      let roster: ClassStudentDoc[] = [];
      let asn: ClassAssignmentDoc[] = [];
      let rk: ClassRiskAlertDoc[] = [];
      let ins: TeacherInsightDoc[] = [];
      let an: ClassAnalyticsDoc[] = [];
      if (isAuthed) {
        [roster, asn, rk, ins, an] = await Promise.all([
          fetchClassStudents(activeClassId).catch(() => []),
          fetchAssignments(activeClassId).catch(() => []),
          fetchRiskAlerts(activeClassId).catch(() => []),
          fetchInsights(activeClassId).catch(() => []),
          fetchClassAnalytics(activeClassId).catch(() => []),
        ]);
      } else {
        roster = readClassStudentsLocal(activeClassId);
        asn = readAssignmentsLocal(activeClassId);
        rk = readRiskLocal(activeClassId);
        ins = readInsightsLocal(activeClassId);
        an = readAnalyticsLocal(activeClassId);
      }
      // Seed students for empty demo classes (guest only).
      if (!roster.length && !isAuthed) {
        roster = seedRoster(activeClassId);
        for (const s of roster) writeClassStudentLocal(s);
      }
      if (!alive) return;
      setStudents(roster);
      setAssignments(asn);
      setRiskAlerts(rk);
      setInsights(ins);
      setAnalytics(
        an.sort((a, b) => b.generatedAt - a.generatedAt)[0] ?? null,
      );
    })();
    return () => {
      alive = false;
    };
  }, [activeClassId, isAuthed]);

  const roster = useMemo(
    () =>
      students.map((s) => ({
        studentUid: s.studentUid,
        studentName: s.studentName,
        summary: s.lastSummary ?? synthesizeStudentSummary(s.studentUid),
      })),
    [students],
  );

  // Auto-refresh analytics + insights + risk when roster changes.
  useEffect(() => {
    if (!activeClassId || !teacherUid || !roster.length) return;
    const cls = classes.find((c) => c.classId === activeClassId);
    if (!cls) return;

    const freshAnalytics = aggregateClassAnalytics({
      classId: activeClassId,
      teacherUid,
      dayKey,
      roster,
    });
    const freshInsights = generateClassInsights({
      classId: activeClassId,
      teacherUid,
      roster,
      dayKey,
    });
    const freshRisk = roster.flatMap((r) =>
      detectStudentRisks({
        classId: activeClassId,
        teacherUid,
        studentUid: r.studentUid,
        studentName: r.studentName,
        summary: r.summary,
        dayKey,
      }),
    );

    setAnalytics(freshAnalytics);
    setInsights((prev) => {
      const ids = new Set(freshInsights.map((i) => i.id));
      return [...prev.filter((i) => !ids.has(i.id)), ...freshInsights];
    });
    setRiskAlerts((prev) => {
      const ids = new Set(freshRisk.map((a) => a.id));
      return [...prev.filter((a) => !ids.has(a.id)), ...freshRisk];
    });

    if (isAuthed) {
      void writeClassAnalytics(freshAnalytics).catch(() => undefined);
      void upsertInsights(freshInsights).catch(() => undefined);
      void upsertRiskAlerts(freshRisk).catch(() => undefined);
    } else {
      writeAnalyticsLocal(freshAnalytics);
      upsertInsightsLocal(freshInsights);
      upsertRiskLocal(freshRisk);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClassId, teacherUid, roster.length, dayKey]);

  const activeClass = useMemo(
    () => classes.find((c) => c.classId === activeClassId) ?? null,
    [classes, activeClassId],
  );

  const createNewClass: TeacherDashboardState["createNewClass"] = useCallback(
    async (name, opts) => {
      if (!teacherUid) return null;
      const classId = rid("cls");
      const inviteCode = generateClassInviteCode();
      const now = Date.now();
      const cls: TeacherClassDoc = {
        id: classId,
        classId,
        teacherUid,
        name,
        school: opts?.school,
        section: opts?.section,
        batch: opts?.batch,
        grade: opts?.grade ?? "SSLC",
        inviteCode,
        studentCount: 0,
        createdAt: now,
        updatedAt: now,
      };
      if (isAuthed) {
        await Promise.all([
          createClass(cls).catch(() => undefined),
          createClassInvite({
            id: inviteCode,
            code: inviteCode,
            classId,
            teacherUid,
            className: name,
            expiresAt: now + 30 * 86400_000,
            createdAt: now,
          }).catch(() => undefined),
        ]);
      } else {
        writeClassLocal(cls);
        writeInviteLocal({
          id: inviteCode,
          code: inviteCode,
          classId,
          teacherUid,
          className: name,
          expiresAt: now + 30 * 86400_000,
          createdAt: now,
        });
      }
      setClasses((prev) => [...prev, cls]);
      setActiveClassId(classId);
      return cls;
    },
    [teacherUid, isAuthed],
  );

  const refreshInsights = useCallback(async () => {
    if (!activeClassId || !teacherUid) return;
    const fresh = generateClassInsights({
      classId: activeClassId,
      teacherUid,
      roster,
      dayKey,
    });
    setInsights(fresh);
    if (isAuthed) await upsertInsights(fresh).catch(() => undefined);
    else upsertInsightsLocal(fresh);
  }, [activeClassId, teacherUid, roster, dayKey, isAuthed]);

  const ackRisk = useCallback(
    async (alertId: string) => {
      if (!activeClassId) return;
      setRiskAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a)),
      );
      if (isAuthed) await acknowledgeRiskAlert(activeClassId, alertId).catch(() => undefined);
      else {
        const next = riskAlerts.map((a) =>
          a.id === alertId ? { ...a, acknowledged: true } : a,
        );
        upsertRiskLocal(next.filter((a) => a.id === alertId));
      }
    },
    [activeClassId, isAuthed, riskAlerts],
  );

  const createAssignment: TeacherDashboardState["createAssignment"] = useCallback(
    async ({ kind, title, description, subjectId, chapterId, dueAt }) => {
      if (!activeClassId || !teacherUid) return null;
      const preset = ASSIGNMENT_PRESETS[kind];
      const subjectName =
        subjectId && mockSubjects.find((s) => s.id === subjectId)?.name;
      const a = buildAssignment({
        classId: activeClassId,
        teacherUid,
        kind,
        title: title ?? preset.defaultTitle(subjectName),
        description,
        subjectId,
        chapterId,
        dueAt,
        totalStudents: students.length,
      });
      setAssignments((prev) => [...prev, a]);
      if (isAuthed) await writeAssignment(a).catch(() => undefined);
      else writeAssignmentLocal(a);
      return a;
    },
    [activeClassId, teacherUid, students.length, isAuthed],
  );

  const unacknowledgedRisk = riskAlerts.filter((a) => !a.acknowledged).length;

  return {
    loading,
    teacherUid,
    isAuthed,
    classes,
    activeClass,
    students,
    analytics,
    insights,
    riskAlerts,
    assignments,
    unacknowledgedRisk,
    setActiveClass: (id) => setActiveClassId(id),
    createNewClass,
    refreshInsights,
    acknowledgeRisk: ackRisk,
    createAssignment,
  };
}