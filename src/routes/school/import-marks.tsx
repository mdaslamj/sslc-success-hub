import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
  AlertTriangle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  buildMarksPreviewRows,
  loadRosterLookup,
  parseMarksFile,
  summarizeMarksPreview,
  type MarksPreviewRow,
} from "@/components/school/CSVImporter";
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
import { buildMarksTemplateCsv, downloadMarksTemplate } from "@/lib/marksTemplate";
import { getSchoolForUser, saveUnitTest } from "@/lib/schoolService";
import { SAMPLE_CHAPTERS } from "@/lib/taskPriorityEngine";
import {
  computeMasteryFromMarks,
  inferGapType,
  processBatchSubmissions,
  type MarkSubmission,
} from "@/lib/unitTestMasteryBridge";
import type { MarkGapType, School, UnitTestSource } from "@/types/school";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/school/import-marks")({
  head: () => ({
    meta: [{ title: "Aura — Import test marks" }],
  }),
  component: SchoolImportMarksPage,
});

type WizardPhase = "select" | "upload" | "preview" | "processing" | "complete";
type TestType = "unit_test" | "sa1" | "sa2";

const SUBJECTS = [
  { id: "science", label: "Science" },
  { id: "math", label: "Math" },
  { id: "social", label: "Social" },
  { id: "english", label: "English" },
  { id: "kannada", label: "Kannada" },
  { id: "hindi", label: "Hindi" },
] as const;

const LANGUAGE_CHAPTERS = [
  { id: "general-1", title: "Unit 1 — General", subjectId: "english" },
  { id: "general-2", title: "Unit 2 — General", subjectId: "english" },
  { id: "general-3", title: "Unit 3 — General", subjectId: "english" },
];

function chaptersForSubject(subjectId: string) {
  const fromSample = SAMPLE_CHAPTERS.filter((ch) => ch.subjectId === subjectId);
  if (fromSample.length > 0) return fromSample;
  if (subjectId === "english" || subjectId === "kannada" || subjectId === "hindi") {
    return LANGUAGE_CHAPTERS.map((ch) => ({
      ...ch,
      id: `${subjectId}-${ch.id}`,
      subjectId,
      blueprintMarks: 4,
      mastery: 50,
    }));
  }
  return [];
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function generateTestId(
  schoolId: string,
  subjectId: string,
  chapterId: string,
  date: string,
  testType: TestType,
): string {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `csv-${schoolId.slice(0, 8)}-${subjectId}-${chapterId}-${date}-${testType}-${suffix}`;
}

function buildQuestionBreakdown(
  row: MarksPreviewRow,
  totalMarks: number,
): MarkSubmission["questionBreakdown"] {
  if (!row.questionMarks || Object.keys(row.questionMarks).length === 0) {
    return undefined;
  }
  const keys = Object.keys(row.questionMarks);
  const perQuestionTotal = Math.max(1, Math.round(totalMarks / keys.length));
  return keys.map((questionId) => ({
    questionId,
    scored: row.questionMarks![questionId] ?? 0,
    total: perQuestionTotal,
  }));
}

function dominantGapType(rows: MarksPreviewRow[], maxMarks: number): MarkGapType {
  const counts: Record<MarkGapType, number> = {
    conceptual: 0,
    procedural: 0,
    expression: 0,
    none: 0,
  };

  for (const row of rows) {
    if (!row.rosterMatch) continue;
    const gap = inferGapType(buildQuestionBreakdown(row, maxMarks));
    counts[gap] += 1;
  }

  const ranked = (Object.entries(counts) as [MarkGapType, number][])
    .filter(([type]) => type !== "none")
    .sort((a, b) => b[1] - a[1]);

  return ranked[0]?.[0] ?? "none";
}

function gapTypeLabel(gap: MarkGapType): string {
  switch (gap) {
    case "conceptual":
      return "Conceptual understanding";
    case "procedural":
      return "Procedural steps";
    case "expression":
      return "Expression / presentation";
    default:
      return "No dominant gap detected";
  }
}

function SchoolImportMarksPage() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [tokenRole, setTokenRole] = useState<string | null>(null);
  const [tokenSchoolId, setTokenSchoolId] = useState<string | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [loadingSchool, setLoadingSchool] = useState(true);

  const [phase, setPhase] = useState<WizardPhase>("select");
  const [subjectId, setSubjectId] = useState("science");
  const [chapterId, setChapterId] = useState("");
  const [testType, setTestType] = useState<TestType>("unit_test");
  const [testDate, setTestDate] = useState(todayIsoDate());
  const [totalMarks, setTotalMarks] = useState(20);
  const [detailedTemplate, setDetailedTemplate] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [previewRows, setPreviewRows] = useState<MarksPreviewRow[]>([]);
  const [processingCurrent, setProcessingCurrent] = useState(0);
  const [processingTotal, setProcessingTotal] = useState(0);
  const [completeStats, setCompleteStats] = useState({
    updatedCount: 0,
    averageScore: 0,
    belowFifty: 0,
    gapType: "none" as MarkGapType,
  });

  const isSchool = tokenRole === "school" || profile?.role === "school";

  const chapterOptions = useMemo(() => chaptersForSubject(subjectId), [subjectId]);
  const selectedChapter = chapterOptions.find((ch) => ch.id === chapterId) ?? chapterOptions[0];
  const subjectLabel = SUBJECTS.find((s) => s.id === subjectId)?.label ?? subjectId;

  useEffect(() => {
    if (chapterOptions.length > 0 && !chapterOptions.some((ch) => ch.id === chapterId)) {
      setChapterId(chapterOptions[0]!.id);
    }
  }, [chapterOptions, chapterId]);

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
        search: { redirect: "/school/import-marks" },
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
        if (active) setSchool(data);
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

  const previewSummary = useMemo(() => summarizeMarksPreview(previewRows), [previewRows]);

  const resetWizard = useCallback(() => {
    setPhase("select");
    setPreviewRows([]);
    setProcessingCurrent(0);
    setProcessingTotal(0);
    setTestDate(todayIsoDate());
  }, []);

  const handleDownloadTemplate = async () => {
    if (!selectedChapter) return;
    setDownloadingTemplate(true);
    try {
      const csv = await buildMarksTemplateCsv({
        subjectId,
        chapterId: selectedChapter.id,
        chapterTitle: selectedChapter.title,
        totalMarks,
        detailed: detailedTemplate,
      });
      downloadMarksTemplate(csv, subjectLabel, selectedChapter.title);
    } catch (err) {
      console.error(err);
      toast.error("Could not generate template.");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!school || !selectedChapter) return;
    setParsing(true);
    try {
      const parsed = await parseMarksFile(file);
      if (parsed.length === 0) {
        toast.error("No student rows found in that file.");
        return;
      }
      const rosterMap = await loadRosterLookup(school.schoolId);
      const previews = await buildMarksPreviewRows(
        parsed,
        rosterMap,
        subjectId,
        selectedChapter.id,
        totalMarks,
      );
      setPreviewRows(previews);
      setPhase("preview");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Could not read that file.");
    } finally {
      setParsing(false);
    }
  };

  const updatePreviewRow = (index: number, patch: Partial<MarksPreviewRow>) => {
    setPreviewRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const next = { ...row, ...patch };
        if (patch.scoredMarks != null) {
          next.newMastery = computeMasteryFromMarks(
            next.previousMastery,
            next.scoredMarks,
            totalMarks,
          );
          next.scorePercent = Math.round((next.scoredMarks / totalMarks) * 100);
        }
        return next;
      }),
    );
  };

  const handleApplyMarks = async () => {
    if (!school || !user || !selectedChapter) return;

    const matched = previewRows.filter((r) => r.rosterMatch);
    if (matched.length === 0) {
      toast.error("No roster-matched students to update.");
      return;
    }

    const testId = generateTestId(
      school.schoolId,
      subjectId,
      selectedChapter.id,
      testDate,
      testType,
    );

    setPhase("processing");
    setProcessingTotal(matched.length);
    setProcessingCurrent(0);

    try {
      const submissions: MarkSubmission[] = matched.map((row) => ({
        studentUid: row.rosterMatch!.auraUid,
        schoolId: school.schoolId,
        testId,
        subjectId,
        chapterId: selectedChapter.id,
        scoredMarks: row.scoredMarks,
        totalMarks,
        questionBreakdown: buildQuestionBreakdown(row, totalMarks),
        source: "csv" as UnitTestSource,
        date: testDate,
        rollNumber: row.rollNumber,
      }));

      await processBatchSubmissions(submissions, (progress) => {
        setProcessingCurrent(progress.current);
        setProcessingTotal(progress.total);
      });

      const questionIds = matched.flatMap((r) => Object.keys(r.questionMarks ?? {}));
      const uniqueQuestionIds = [...new Set(questionIds)];

      await saveUnitTest(school.schoolId, {
        testId,
        schoolId: school.schoolId,
        subjectId,
        chapterId: selectedChapter.id,
        teacherId: user.uid,
        date: testDate,
        totalMarks,
        questionBreakdown:
          uniqueQuestionIds.length > 0
            ? uniqueQuestionIds.map((questionId) => ({
                questionId,
                marks: Math.max(
                  1,
                  Math.round(totalMarks / Math.max(1, uniqueQuestionIds.length)),
                ),
              }))
            : [],
        studentCount: matched.length,
        source: "csv",
      });

      const averageScore = Math.round(
        matched.reduce((sum, r) => sum + r.scorePercent, 0) / matched.length,
      );
      const belowFifty = matched.filter((r) => r.scorePercent < 50).length;

      setCompleteStats({
        updatedCount: matched.length,
        averageScore,
        belowFifty,
        gapType: dominantGapType(matched, totalMarks),
      });
      setPhase("complete");
      toast.success(`Marks applied for ${matched.length} students`);
    } catch (err) {
      console.error(err);
      toast.error("Could not apply marks. Please try again.");
      setPhase("preview");
    }
  };

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
        paddingBottom: "max(env(safe-area-inset-bottom), 2rem)",
      }}
    >
      <div className="mx-auto max-w-3xl space-y-6">
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
              <FileSpreadsheet className="h-5 w-5 text-[#8B5CF6]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Import test marks</h1>
              <p className="mt-1 text-sm text-white/70">
                Upload a CSV or Excel file — Aura maps students and updates mastery
              </p>
            </div>
          </div>
        </header>

        {phase === "select" ? (
          <div className="fade-in space-y-6">
            <section className="rounded-2xl border border-white/10 bg-[#14141F] p-5 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/55">Subject</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {SUBJECTS.map((subject) => (
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

            <Button
              type="button"
              className="w-full rounded-xl bg-[#8B5CF6] py-6 text-base font-semibold text-white hover:bg-[#7C3AED]"
              disabled={!selectedChapter}
              onClick={() => setPhase("upload")}
            >
              Continue to upload
            </Button>
          </div>
        ) : null}

        {phase === "upload" ? (
          <div className="fade-in space-y-6">
            <div className="rounded-xl border border-white/10 bg-[#14141F] px-4 py-3 text-sm text-white/75">
              {subjectLabel} — {selectedChapter?.title} · {testType.replace("_", " ").toUpperCase()} ·{" "}
              {totalMarks} marks · {testDate}
            </div>

            <label className="flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={detailedTemplate}
                onChange={(e) => setDetailedTemplate(e.target.checked)}
                className="rounded border-white/20"
              />
              Include question columns in template (Q1, Q2, Q3…)
            </label>

            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl border-white/10 bg-transparent text-white hover:bg-white/5"
              disabled={downloadingTemplate}
              onClick={() => void handleDownloadTemplate()}
            >
              {downloadingTemplate ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Download template for {subjectLabel} — {selectedChapter?.title}
            </Button>

            <label
              className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/15 bg-[#14141F] px-6 py-12 text-center transition-colors hover:border-[#8B5CF6]/50"
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const file = e.dataTransfer.files?.[0];
                if (file) void handleFileSelect(file);
              }}
            >
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="sr-only"
                disabled={parsing}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFileSelect(file);
                }}
              />
              {parsing ? (
                <p className="text-sm text-white/70">Reading file…</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-white">Drop your marks file here</p>
                  <p className="mt-2 text-xs text-white/55">Accepts .csv and .xlsx</p>
                </>
              )}
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-[#14141F] p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/55">
                  Simple format
                </p>
                <p
                  className="mt-2 text-sm text-white/80"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Roll No | Name | Total Marks
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#14141F] p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/55">
                  Detailed format
                </p>
                <p
                  className="mt-2 text-sm text-white/80"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  Roll No | Name | Q1 | Q2 | Q3 | Total
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              className="text-white/60"
              onClick={() => setPhase("select")}
            >
              ← Back to test details
            </Button>
          </div>
        ) : null}

        {phase === "preview" ? (
          <div className="fade-in space-y-6">
            <div className="rounded-xl border border-white/10 bg-[#14141F] p-4 text-sm text-white/80">
              <p>
                <strong className="text-white">{previewSummary.matchedCount}</strong> students will
                be updated
              </p>
              <p className="mt-1">
                <strong className="text-amber-300">{previewSummary.skippedCount}</strong> students
                skipped (not in roster)
              </p>
              <p className="mt-1">
                Average score: <strong className="text-white">{previewSummary.averageScore}%</strong>
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-[#14141F] text-xs uppercase tracking-wider text-white/55">
                  <tr>
                    <th className="px-3 py-3">Roll No</th>
                    <th className="px-3 py-3">Student Name</th>
                    <th className="px-3 py-3">Roster Match</th>
                    <th className="px-3 py-3">Marks</th>
                    <th className="px-3 py-3">Score %</th>
                    <th className="px-3 py-3">Prev Mastery</th>
                    <th className="px-3 py-3">New Mastery</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, index) => (
                    <tr key={`${row.rollNumber}-${index}`} className="border-t border-white/5">
                      <td className="px-3 py-2">
                        <Input
                          value={row.rollNumber}
                          onChange={(e) =>
                            updatePreviewRow(index, { rollNumber: e.target.value })
                          }
                          className="h-8 border-white/10 bg-[#0F0F18] text-white"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={row.name}
                          onChange={(e) => updatePreviewRow(index, { name: e.target.value })}
                          className="h-8 border-white/10 bg-[#0F0F18] text-white"
                        />
                      </td>
                      <td className="px-3 py-2">
                        {row.rosterMatch ? (
                          <span className="inline-flex items-center gap-1 text-green-400">
                            <CheckCircle2 className="h-4 w-4" />
                            {row.rosterMatch.auraName}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-300">
                            <AlertTriangle className="h-4 w-4" />
                            Not in roster
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min={0}
                            max={totalMarks}
                            value={row.scoredMarks}
                            onChange={(e) =>
                              updatePreviewRow(index, {
                                scoredMarks: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            className="h-8 w-16 border-white/10 bg-[#0F0F18] text-white"
                          />
                          <span className="text-white/50">/{totalMarks}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-white/80">{row.scorePercent}%</td>
                      <td className="px-3 py-2 text-white/80">{row.previousMastery}</td>
                      <td className="px-3 py-2 font-medium text-[#C4B5FD]">{row.newMastery}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                className="flex-1 rounded-xl bg-[#8B5CF6] py-6 text-base font-semibold text-white hover:bg-[#7C3AED]"
                disabled={previewSummary.matchedCount === 0}
                onClick={() => void handleApplyMarks()}
              >
                Apply marks to {previewSummary.matchedCount} students
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-white/10 text-white hover:bg-white/5"
                onClick={() => setPhase("upload")}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        {phase === "processing" ? (
          <div className="fade-in space-y-6 rounded-2xl border border-white/10 bg-[#14141F] p-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#8B5CF6]" />
            <p className="text-sm text-white/80">
              Updating student {processingCurrent} of {processingTotal}…
            </p>
            <Progress
              value={processingTotal > 0 ? (processingCurrent / processingTotal) * 100 : 0}
              className="h-2"
            />
          </div>
        ) : null}

        {phase === "complete" ? (
          <div className="fade-in space-y-6 text-center">
            <div className="rounded-2xl border border-green-500/30 bg-green-500/10 px-6 py-8">
              <h2 className="text-xl font-bold text-white">Marks applied successfully</h2>
              <div className="mt-6 grid gap-3 text-left text-sm text-white/80 sm:grid-cols-2">
                <p>
                  <span className="text-white/55">Students updated</span>
                  <br />
                  <strong className="text-lg text-white">{completeStats.updatedCount}</strong>
                </p>
                <p>
                  <span className="text-white/55">Class average</span>
                  <br />
                  <strong className="text-lg text-white">{completeStats.averageScore}%</strong>
                </p>
                <p>
                  <span className="text-white/55">Below 50%</span>
                  <br />
                  <strong className="text-lg text-amber-300">{completeStats.belowFifty}</strong> need
                  attention
                </p>
                <p>
                  <span className="text-white/55">Primary gap type</span>
                  <br />
                  <strong className="text-lg text-white">
                    {gapTypeLabel(completeStats.gapType)}
                  </strong>
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                className="flex-1 rounded-xl bg-[#8B5CF6] py-6 text-base font-semibold text-white hover:bg-[#7C3AED]"
              >
                <Link to="/school/dashboard">View class results</Link>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-xl border-white/10 text-white hover:bg-white/5"
                onClick={resetWizard}
              >
                Import another test
              </Button>
            </div>
          </div>
        ) : null}
      </div>

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
