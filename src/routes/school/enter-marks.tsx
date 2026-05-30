import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ClipboardList, Loader2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { useMarkSubmission } from "@/hooks/useMarkSubmission";
import {
  chaptersForSubject,
  defaultQuestionColumns,
  generateSchoolTestId,
  redistributeQuestionMarks,
  SCHOOL_MARK_SUBJECTS,
  scoreColorClass,
  scorePercent,
  todayIsoDate,
  type MarksEntryMode,
  type QuestionColumn,
  type SchoolTestType,
} from "@/lib/schoolMarksSetup";
import { getSchoolForUser, getSchoolRosterEntries, saveUnitTest } from "@/lib/schoolService";
import type { MarkSubmission } from "@/lib/unitTestMasteryBridge";
import type { School, SchoolRosterEntry, UnitTestSource } from "@/types/school";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/school/enter-marks")({
  head: () => ({
    meta: [{ title: "Aura — Enter test marks" }],
  }),
  component: SchoolEnterMarksPage,
});

type Phase = "setup" | "entry" | "saving" | "saved";

type EntryRow = {
  rollNumber: string;
  studentName: string;
  auraUid: string;
  marks: number | null;
  questionMarks: Record<string, number>;
};

type MarksDraft = {
  testId: string;
  schoolId: string;
  savedAt: string;
  setup: {
    subjectId: string;
    chapterId: string;
    testType: SchoolTestType;
    testDate: string;
    totalMarks: number;
    mode: MarksEntryMode;
    questionColumns: QuestionColumn[];
  };
  rows: EntryRow[];
};

type SavedSummary = {
  count: number;
  averageScore: number;
  highestName: string;
  highestScore: number;
  belowFifty: number;
};

const DRAFT_PREFIX = "aura_marks_draft_";

function draftStorageKey(testId: string): string {
  return `${DRAFT_PREFIX}${testId}`;
}

function findLatestDraft(schoolId: string): MarksDraft | null {
  if (typeof localStorage === "undefined") return null;
  let latest: MarksDraft | null = null;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(DRAFT_PREFIX)) continue;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const draft = JSON.parse(raw) as MarksDraft;
      if (draft.schoolId !== schoolId) continue;
      if (!latest || draft.savedAt.localeCompare(latest.savedAt) > 0) {
        latest = draft;
      }
    } catch {
      /* ignore corrupt drafts */
    }
  }

  return latest;
}

function clearDraft(testId: string): void {
  try {
    localStorage.removeItem(draftStorageKey(testId));
  } catch {
    /* ignore */
  }
}

function rowIsFilled(row: EntryRow, mode: MarksEntryMode, columns: QuestionColumn[]): boolean {
  if (mode === "quick") {
    return row.marks != null && !Number.isNaN(row.marks);
  }
  return columns.some((col) => (row.questionMarks[col.id] ?? 0) > 0);
}

function rowScoredMarks(
  row: EntryRow,
  mode: MarksEntryMode,
  columns: QuestionColumn[],
): number {
  if (mode === "quick") {
    return row.marks ?? 0;
  }
  return columns.reduce((sum, col) => sum + (row.questionMarks[col.id] ?? 0), 0);
}

function buildQuestionBreakdown(
  row: EntryRow,
  columns: QuestionColumn[],
): MarkSubmission["questionBreakdown"] {
  if (columns.length === 0) return undefined;
  return columns.map((col) => ({
    questionId: col.id,
    scored: row.questionMarks[col.id] ?? 0,
    total: col.maxMarks,
  }));
}

function formatDraftTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function SchoolEnterMarksPage() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { submitMarks } = useMarkSubmission();

  const [tokenRole, setTokenRole] = useState<string | null>(null);
  const [tokenSchoolId, setTokenSchoolId] = useState<string | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [loadingSchool, setLoadingSchool] = useState(true);
  const [rosterLoading, setRosterLoading] = useState(false);

  const [phase, setPhase] = useState<Phase>("setup");
  const [subjectId, setSubjectId] = useState("science");
  const [chapterId, setChapterId] = useState("");
  const [testType, setTestType] = useState<SchoolTestType>("unit_test");
  const [testDate, setTestDate] = useState(todayIsoDate());
  const [totalMarks, setTotalMarks] = useState(20);
  const [mode, setMode] = useState<MarksEntryMode>("quick");
  const [questionColumns, setQuestionColumns] = useState<QuestionColumn[]>(() =>
    defaultQuestionColumns(20),
  );
  const [testId, setTestId] = useState("");
  const [rows, setRows] = useState<EntryRow[]>([]);
  const [pendingDraft, setPendingDraft] = useState<MarksDraft | null>(null);

  const [savingCurrent, setSavingCurrent] = useState(0);
  const [savingTotal, setSavingTotal] = useState(0);
  const [savedSummary, setSavedSummary] = useState<SavedSummary | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const isSchool = tokenRole === "school" || profile?.role === "school";
  const chapterOptions = useMemo(() => chaptersForSubject(subjectId), [subjectId]);
  const selectedChapter = chapterOptions.find((ch) => ch.id === chapterId) ?? chapterOptions[0];

  useEffect(() => {
    if (chapterOptions.length > 0 && !chapterOptions.some((ch) => ch.id === chapterId)) {
      setChapterId(chapterOptions[0]!.id);
    }
  }, [chapterOptions, chapterId]);

  useEffect(() => {
    setQuestionColumns((prev) => redistributeQuestionMarks(prev, totalMarks));
  }, [totalMarks]);

  useEffect(() => {
    if (!user) {
      setTokenRole(null);
      setTokenSchoolId(null);
      return;
    }
    void user.getIdTokenResult().then((result) => {
      setTokenRole(typeof result.claims.role === "string" ? result.claims.role : null);
      setTokenSchoolId(
        typeof result.claims.schoolId === "string" ? result.claims.schoolId : null,
      );
    });
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      void navigate({
        to: "/login",
        search: { redirect: "/school/enter-marks" },
      });
      return;
    }
    if (!isSchool) {
      void navigate({ to: "/" });
    }
  }, [authLoading, user, isSchool, navigate]);

  useEffect(() => {
    if (!user || !isSchool) return;
    let active = true;
    void (async () => {
      setLoadingSchool(true);
      try {
        const data = await getSchoolForUser(user.uid, tokenSchoolId);
        if (!active) return;
        setSchool(data);
        if (data) {
          const draft = findLatestDraft(data.schoolId);
          if (draft) setPendingDraft(draft);
        }
      } catch (err) {
        console.error(err);
        if (active) toast.error("Could not load your school.");
      } finally {
        if (active) setLoadingSchool(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user, isSchool, tokenSchoolId]);

  const filledRows = useMemo(
    () => rows.filter((row) => rowIsFilled(row, mode, questionColumns)),
    [rows, mode, questionColumns],
  );

  const liveStats = useMemo(() => {
    const entered = filledRows.length;
    const remaining = rows.length - entered;
    const averageScore =
      entered > 0
        ? Math.round(
            filledRows.reduce(
              (sum, row) => sum + scorePercent(rowScoredMarks(row, mode, questionColumns), totalMarks),
              0,
            ) / entered,
          )
        : 0;
    const belowFifty = filledRows.filter(
      (row) => scorePercent(rowScoredMarks(row, mode, questionColumns), totalMarks) < 50,
    ).length;

    return { entered, remaining, averageScore, belowFifty };
  }, [filledRows, rows.length, mode, questionColumns, totalMarks]);

  const persistDraft = useCallback(() => {
    if (!school || !testId || phase !== "entry") return;
    const draft: MarksDraft = {
      testId,
      schoolId: school.schoolId,
      savedAt: new Date().toISOString(),
      setup: {
        subjectId,
        chapterId,
        testType,
        testDate,
        totalMarks,
        mode,
        questionColumns,
      },
      rows,
    };
    try {
      localStorage.setItem(draftStorageKey(testId), JSON.stringify(draft));
    } catch {
      /* storage full */
    }
  }, [
    school,
    testId,
    phase,
    subjectId,
    chapterId,
    testType,
    testDate,
    totalMarks,
    mode,
    questionColumns,
    rows,
  ]);

  useEffect(() => {
    if (phase !== "entry") return;
    const timer = window.setInterval(() => persistDraft(), 30_000);
    return () => window.clearInterval(timer);
  }, [phase, persistDraft]);

  const rosterToEntryRows = (entries: SchoolRosterEntry[]): EntryRow[] =>
    entries
      .filter((entry) => entry.auraUid)
      .sort((a, b) => a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true }))
      .map((entry) => ({
        rollNumber: entry.rollNumber,
        studentName: entry.studentName,
        auraUid: entry.auraUid!,
        marks: null,
        questionMarks: Object.fromEntries(questionColumns.map((col) => [col.id, 0])),
      }));

  const applyDraft = (draft: MarksDraft) => {
    setTestId(draft.testId);
    setSubjectId(draft.setup.subjectId);
    setChapterId(draft.setup.chapterId);
    setTestType(draft.setup.testType);
    setTestDate(draft.setup.testDate);
    setTotalMarks(draft.setup.totalMarks);
    setMode(draft.setup.mode);
    setQuestionColumns(draft.setup.questionColumns);
    setRows(draft.rows);
    setPhase("entry");
    setPendingDraft(null);
  };

  const handleStartFresh = async () => {
    if (!school || !selectedChapter) return;
    setPendingDraft(null);
    setRosterLoading(true);
    try {
      const entries = await getSchoolRosterEntries(school.schoolId);
      const rosterRows = rosterToEntryRows(entries);
      if (rosterRows.length === 0) {
        toast.error("No roster students found. Import your class roster first.");
        return;
      }
      const newTestId = generateSchoolTestId(
        "manual",
        school.schoolId,
        subjectId,
        selectedChapter.id,
        testDate,
        testType,
      );
      setTestId(newTestId);
      setQuestionColumns(defaultQuestionColumns(totalMarks));
      setRows(
        rosterRows.map((row) => ({
          ...row,
          questionMarks: Object.fromEntries(
            defaultQuestionColumns(totalMarks).map((col) => [col.id, 0]),
          ),
        })),
      );
      setPhase("entry");
    } catch (err) {
      console.error(err);
      toast.error("Could not load class roster.");
    } finally {
      setRosterLoading(false);
    }
  };

  const handleContinueDraft = () => {
    if (pendingDraft) applyDraft(pendingDraft);
  };

  const handleDismissDraft = () => {
    if (pendingDraft) clearDraft(pendingDraft.testId);
    setPendingDraft(null);
  };

  const updateRow = (index: number, patch: Partial<EntryRow>) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const updateQuestionMark = (rowIndex: number, questionId: string, value: number) => {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== rowIndex) return row;
        const questionMarks = { ...row.questionMarks, [questionId]: value };
        const total = questionColumns.reduce(
          (sum, col) => sum + (questionMarks[col.id] ?? 0),
          0,
        );
        return { ...row, questionMarks, marks: total };
      }),
    );
  };

  const focusInputAt = (index: number) => {
    inputRefs.current[index]?.focus();
    inputRefs.current[index]?.select();
  };

  const handleMarksKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || (event.key === "Tab" && !event.shiftKey)) {
      event.preventDefault();
      focusInputAt(index + 1);
    }
    if (event.key === "Escape") {
      event.currentTarget.blur();
    }
  };

  const handleQuestionKeyDown = (
    flatIndex: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Enter" || (event.key === "Tab" && !event.shiftKey)) {
      event.preventDefault();
      focusInputAt(flatIndex + 1);
    }
    if (event.key === "Escape") {
      event.currentTarget.blur();
    }
  };

  const buildSubmissions = (): MarkSubmission[] => {
    if (!school || !selectedChapter) return [];
    return filledRows.map((row) => ({
      studentUid: row.auraUid,
      schoolId: school.schoolId,
      testId,
      subjectId,
      chapterId: selectedChapter.id,
      scoredMarks: rowScoredMarks(row, mode, questionColumns),
      totalMarks,
      questionBreakdown:
        mode === "detailed" ? buildQuestionBreakdown(row, questionColumns) : undefined,
      source: "manual" as UnitTestSource,
      date: testDate,
      rollNumber: row.rollNumber,
    }));
  };

  const saveMarks = async (exitAfter: boolean) => {
    if (!school || !user || !selectedChapter || filledRows.length === 0) {
      toast.error("Enter marks for at least one student.");
      return;
    }

    setPhase("saving");
    setSavingTotal(filledRows.length);
    setSavingCurrent(0);

    try {
      const submissions = buildSubmissions();
      await submitMarks(submissions, (progress) => {
        setSavingCurrent(progress.current);
        setSavingTotal(progress.total);
      });

      const uniqueQuestionIds = questionColumns.map((col) => col.id);
      await saveUnitTest(school.schoolId, {
        testId,
        schoolId: school.schoolId,
        subjectId,
        chapterId: selectedChapter.id,
        teacherId: user.uid,
        date: testDate,
        totalMarks,
        questionBreakdown:
          mode === "detailed"
            ? questionColumns.map((col) => ({ questionId: col.id, marks: col.maxMarks }))
            : [],
        studentCount: filledRows.length,
        source: "manual",
      });

      clearDraft(testId);

      const scores = filledRows.map((row) => ({
        name: row.studentName,
        percent: scorePercent(rowScoredMarks(row, mode, questionColumns), totalMarks),
      }));
      const highest = scores.reduce(
        (best, current) => (current.percent > best.percent ? current : best),
        scores[0]!,
      );

      if (exitAfter) {
        toast.success(`Marks saved for ${filledRows.length} students`);
        void navigate({ to: "/teacher" });
        return;
      }

      setSavedSummary({
        count: filledRows.length,
        averageScore: liveStats.averageScore,
        highestName: highest.name,
        highestScore: highest.percent,
        belowFifty: liveStats.belowFifty,
      });
      setPhase("saved");
      toast.success(`Marks saved for ${filledRows.length} students`);
    } catch (err) {
      console.error(err);
      toast.error("Could not save marks. Please try again.");
      setPhase("entry");
    }
  };

  const resetWizard = () => {
    setPhase("setup");
    setRows([]);
    setTestId("");
    setSavedSummary(null);
    setSavingCurrent(0);
    setSavingTotal(0);
    if (school) {
      const draft = findLatestDraft(school.schoolId);
      setPendingDraft(draft);
    }
  };

  let flatInputIndex = 0;

  if (authLoading || !user || !isSchool || loadingSchool) {
    return (
      <div
        className="flex min-h-[100dvh] items-center justify-center"
        style={{ background: "#08080E" }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-[#8B5CF6]" />
      </div>
    );
  }

  if (!school) {
    return (
      <div
        className="min-h-[100dvh] px-4 py-8"
        style={{ background: "#08080E", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        <div className="mx-auto max-w-lg text-center text-white">
          <p className="text-sm text-white/70">School not found for this account.</p>
          <Button asChild className="mt-4">
            <Link to="/school/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-[100dvh] px-4 py-8"
      style={{
        background: "#08080E",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        paddingBottom: phase === "entry" ? "11rem" : "max(env(safe-area-inset-bottom), 2rem)",
      }}
    >
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="space-y-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1 px-0 text-white/60 hover:bg-transparent hover:text-white"
            onClick={() => void navigate({ to: "/school/dashboard" })}
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Button>
          <div className="flex items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "rgba(139,92,246,0.2)" }}
            >
              <ClipboardList className="h-5 w-5 text-[#8B5CF6]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Enter test marks</h1>
              <p className="mt-1 text-sm text-white/70">Type marks directly for your class</p>
            </div>
          </div>
        </header>

        {pendingDraft && phase === "setup" ? (
          <div className="rounded-2xl border border-amber-500/35 bg-amber-500/10 p-5">
            <p className="text-sm text-amber-100">
              You have unsaved marks from {formatDraftTime(pendingDraft.savedAt)}. Continue where you
              left off?
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                className="rounded-xl bg-[#8B5CF6] text-white hover:bg-[#7C3AED]"
                onClick={handleContinueDraft}
              >
                Yes, continue
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-white/15 text-white hover:bg-white/5"
                onClick={handleDismissDraft}
              >
                Start fresh
              </Button>
            </div>
          </div>
        ) : null}

        {phase === "setup" ? (
          <div className="fade-in space-y-6">
            <section className="rounded-2xl border border-white/10 bg-[#14141F] p-5 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/55">Subject</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {SCHOOL_MARK_SUBJECTS.map((subject) => (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => setSubjectId(subject.id)}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                      subjectId === subject.id
                        ? "border-[#8B5CF6] bg-[#8B5CF6]/20 text-white"
                        : "border-white/10 bg-transparent text-white/75 hover:border-white/20",
                    )}
                  >
                    {subject.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#14141F] p-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/55">Chapter</p>
              <Select value={chapterId} onValueChange={setChapterId}>
                <SelectTrigger className="border-white/10 bg-[#0F0F18] text-white">
                  <SelectValue placeholder="Select chapter" />
                </SelectTrigger>
                <SelectContent>
                  {chapterOptions.map((ch) => (
                    <SelectItem key={ch.id} value={ch.id}>
                      {ch.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#14141F] p-5 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/55">Test type</p>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["unit_test", "Unit Test"],
                    ["sa1", "SA1"],
                    ["sa2", "SA2"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTestType(id)}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                      testType === id
                        ? "border-[#8B5CF6] bg-[#8B5CF6]/20 text-white"
                        : "border-white/10 bg-transparent text-white/75 hover:border-white/20",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#14141F] p-5 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/55">Date</p>
                <Input
                  type="date"
                  value={testDate}
                  onChange={(e) => setTestDate(e.target.value)}
                  className="border-white/10 bg-[#0F0F18] text-white"
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/55">
                  Total marks
                </p>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={totalMarks}
                  onChange={(e) => setTotalMarks(Math.max(1, Number(e.target.value) || 1))}
                  className="border-white/10 bg-[#0F0F18] text-white"
                />
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-[#14141F] p-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/55">Entry mode</p>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["quick", "Quick mode"],
                    ["detailed", "Detailed mode"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMode(id)}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                      mode === id
                        ? "border-[#8B5CF6] bg-[#8B5CF6]/20 text-white"
                        : "border-white/10 bg-transparent text-white/75 hover:border-white/20",
                    )}
                  >
                    {label}
                    <span className="mt-0.5 block text-xs font-normal text-white/50">
                      {id === "quick" ? "Total marks only" : "Marks per question"}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <Button
              type="button"
              className="w-full rounded-xl bg-[#8B5CF6] py-6 text-base font-semibold text-white hover:bg-[#7C3AED]"
              disabled={!selectedChapter || rosterLoading}
              onClick={() => void handleStartFresh()}
            >
              {rosterLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading class list…
                </>
              ) : (
                "Start entering marks"
              )}
            </Button>
          </div>
        ) : null}

        {phase === "entry" ? (
          <div className="fade-in space-y-4">
            <div className="rounded-xl border border-white/10 bg-[#14141F] px-4 py-3 text-sm text-white/75">
              {SCHOOL_MARK_SUBJECTS.find((s) => s.id === subjectId)?.label} —{" "}
              {selectedChapter?.title} · {mode === "quick" ? "Quick" : "Detailed"} · {totalMarks}{" "}
              marks
            </div>

            {mode === "detailed" ? (
              <div className="rounded-xl border border-white/10 bg-[#14141F] p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/55">
                  Question scheme
                </p>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-white/55">Questions</label>
                    <Input
                      type="number"
                      min={1}
                      max={15}
                      value={questionColumns.length}
                      onChange={(e) => {
                        const count = Math.max(1, Math.min(15, Number(e.target.value) || 1));
                        setQuestionColumns(defaultQuestionColumns(totalMarks, count));
                      }}
                      className="h-9 w-20 border-white/10 bg-[#0F0F18] text-white"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-white/10 text-white hover:bg-white/5"
                    onClick={() =>
                      setQuestionColumns(redistributeQuestionMarks(questionColumns, totalMarks))
                    }
                  >
                    Redistribute marks
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {questionColumns.map((col, colIndex) => (
                    <div key={col.id} className="flex items-center gap-1 text-xs text-white/70">
                      <span>{col.id}</span>
                      <Input
                        type="number"
                        min={1}
                        value={col.maxMarks}
                        onChange={(e) => {
                          const maxMarks = Math.max(1, Number(e.target.value) || 1);
                          setQuestionColumns((prev) =>
                            prev.map((item, i) => (i === colIndex ? { ...item, maxMarks } : item)),
                          );
                        }}
                        className="h-8 w-14 border-white/10 bg-[#0F0F18] text-white"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-[#14141F] text-xs uppercase tracking-wider text-white/55">
                  <tr>
                    <th className="px-3 py-3">Roll No</th>
                    <th className="px-3 py-3">Student Name</th>
                    {mode === "detailed"
                      ? questionColumns.map((col) => (
                          <th key={col.id} className="px-3 py-3">
                            {col.id}
                          </th>
                        ))
                      : null}
                    <th className="px-3 py-3">{mode === "detailed" ? "Total" : "Marks"}</th>
                    <th className="px-3 py-3">Score %</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => {
                    const scored = rowScoredMarks(row, mode, questionColumns);
                    const percent = rowIsFilled(row, mode, questionColumns)
                      ? scorePercent(scored, totalMarks)
                      : null;

                    return (
                      <tr key={row.rollNumber} className="border-t border-white/5">
                        <td className="px-3 py-2 font-mono text-white/80">{row.rollNumber}</td>
                        <td className="px-3 py-2 text-white/90">{row.studentName}</td>

                        {mode === "detailed"
                          ? questionColumns.map((col) => {
                              const refIndex = flatInputIndex++;
                              return (
                                <td key={col.id} className="px-3 py-2">
                                  <Input
                                    ref={(el) => {
                                      inputRefs.current[refIndex] = el;
                                    }}
                                    type="number"
                                    min={0}
                                    max={col.maxMarks}
                                    value={row.questionMarks[col.id] ?? ""}
                                    onChange={(e) =>
                                      updateQuestionMark(
                                        rowIndex,
                                        col.id,
                                        Math.min(
                                          col.maxMarks,
                                          Math.max(0, Number(e.target.value) || 0),
                                        ),
                                      )
                                    }
                                    onKeyDown={(e) => handleQuestionKeyDown(refIndex, e)}
                                    className="h-8 w-14 border-white/10 bg-[#0F0F18] text-white"
                                  />
                                </td>
                              );
                            })
                          : null}

                        <td className="px-3 py-2">
                          {mode === "quick" ? (
                            (() => {
                              const refIndex = flatInputIndex++;
                              return (
                                <Input
                                  ref={(el) => {
                                    inputRefs.current[refIndex] = el;
                                  }}
                                  type="number"
                                  min={0}
                                  max={totalMarks}
                                  value={row.marks ?? ""}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    updateRow(rowIndex, {
                                      marks: raw === "" ? null : Math.min(totalMarks, Math.max(0, Number(raw) || 0)),
                                    });
                                  }}
                                  onKeyDown={(e) => handleMarksKeyDown(refIndex, e)}
                                  className="h-8 w-20 border-white/10 bg-[#0F0F18] text-white"
                                />
                              );
                            })()
                          ) : (
                            <span className="font-medium text-white">{scored}</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {percent != null ? (
                            <span className={cn("font-medium", scoreColorClass(percent))}>
                              {percent}%
                            </span>
                          ) : (
                            <span className="text-white/30">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {phase === "saving" ? (
          <div className="fade-in space-y-6 rounded-2xl border border-white/10 bg-[#14141F] p-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#8B5CF6]" />
            <p className="text-sm text-white/80">
              Saving marks for {savingTotal} students… ({savingCurrent}/{savingTotal})
            </p>
            <Progress
              value={savingTotal > 0 ? (savingCurrent / savingTotal) * 100 : 0}
              className="h-2"
            />
          </div>
        ) : null}

        {phase === "saved" && savedSummary ? (
          <div className="fade-in space-y-6 text-center">
            <div className="rounded-2xl border border-green-500/30 bg-green-500/10 px-6 py-8">
              <h2 className="text-xl font-bold text-white">
                Marks saved for {savedSummary.count} students
              </h2>
              <div className="mt-6 grid gap-3 text-left text-sm text-white/80 sm:grid-cols-2">
                <p>
                  <span className="text-white/55">Class average</span>
                  <br />
                  <strong className="text-lg text-white">{savedSummary.averageScore}%</strong>
                </p>
                <p>
                  <span className="text-white/55">Highest</span>
                  <br />
                  <strong className="text-lg text-white">
                    {savedSummary.highestName} — {savedSummary.highestScore}%
                  </strong>
                </p>
                <p className="sm:col-span-2">
                  <span className="text-white/55">Needs attention</span>
                  <br />
                  <strong className="text-lg text-amber-300">
                    {savedSummary.belowFifty} students below 50%
                  </strong>
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                className="flex-1 rounded-xl bg-[#8B5CF6] py-6 text-base font-semibold text-white hover:bg-[#7C3AED]"
              >
                <Link to="/teacher">View class dashboard</Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-xl border-white/10 text-white hover:bg-white/5"
                onClick={resetWizard}
              >
                Enter another test
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {phase === "entry" ? (
        <div
          className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#0F0F18]/95 px-4 py-4 backdrop-blur-md"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
        >
          <div className="mx-auto max-w-4xl space-y-3">
            <p className="text-center text-sm text-white/75">
              Class average: <strong className="text-white">{liveStats.averageScore}%</strong> ·{" "}
              <strong className="text-white">{liveStats.entered}</strong> entered ·{" "}
              <strong className="text-white">{liveStats.remaining}</strong> remaining ·{" "}
              <strong className="text-amber-300">{liveStats.belowFifty}</strong> below 50%
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                className="flex-1 rounded-xl bg-[#8B5CF6] py-5 font-semibold text-white hover:bg-[#7C3AED]"
                disabled={liveStats.entered === 0}
                onClick={() => void saveMarks(false)}
              >
                Save marks for {liveStats.entered} students
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-xl border-white/10 py-5 text-white hover:bg-white/5"
                disabled={liveStats.entered === 0}
                onClick={() => void saveMarks(true)}
              >
                Save and exit
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <style>{`
        .fade-in { animation: fadeIn 0.35s ease-out; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
