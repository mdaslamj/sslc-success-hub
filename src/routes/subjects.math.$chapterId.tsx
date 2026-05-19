import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  Brain,
  CalendarPlus,
  ChevronRight,
  ExternalLink,
  FileText,
  Lightbulb,
  Loader2,
  Sparkles,
  Sigma,
  Target,
  TrendingUp,
  AlertTriangle,
  ThumbsUp,
} from "lucide-react";
import { toast } from "sonner";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

import { useChapterMastery } from "@/hooks/use-math-mastery";
import {
  fetchLibraryResources,
  fetchMathQuestions,
  fetchMathFormulasForChapter,
} from "@/integrations/firebase/services";
import { seedMathData } from "@/integrations/firebase/services/math-import";
import { UploadAnswerButton } from "@/components/answer-upload/upload-answer-button";
import { addToTodayPlan } from "@/lib/today-plan-store";
import { tierFor } from "@/lib/math-intelligence/mastery-tiers";
import type {
  LibraryResourceDoc,
  MathFormulaDoc,
  MathQuestionDoc,
} from "@/integrations/firebase/types";

export const Route = createFileRoute("/subjects/math/$chapterId")({
  head: ({ params }) => ({
    meta: [
      { title: `Math chapter ${params.chapterId} — VidyaPath` },
      {
        name: "description",
        content:
          "Unified Mathematics workflow — learn, practice, test, evaluate and improve, with chapter intelligence and real mastery analytics.",
      },
    ],
  }),
  notFoundComponent: () => (
    <DashboardLayout title="Not found">
      <div className="mx-auto max-w-lg py-24 text-center">
        <h1 className="font-display text-2xl font-bold">Chapter not found</h1>
        <Button asChild className="mt-4 rounded-full">
          <Link to="/subjects/$subjectId" params={{ subjectId: "math" }}>
            Back to Math
          </Link>
        </Button>
      </div>
    </DashboardLayout>
  ),
  errorComponent: ({ error }) => {
    if (typeof console !== "undefined") console.error("math hub failed", error);
    return (
      <DashboardLayout title="Error">
        <div className="mx-auto max-w-lg py-24 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-3 font-display text-2xl font-bold">
            Couldn't load this chapter
          </h1>
          <Button asChild className="mt-4 rounded-full">
            <Link to="/subjects/$subjectId" params={{ subjectId: "math" }}>
              Back to Math
            </Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  },
  component: MathChapterHub,
});

function MathChapterHub() {
  const { chapterId } = Route.useParams();
  const queryClient = useQueryClient();
  const {
    chapter,
    mastery,
    isChapterLoading,
    isChapterMissing,
    isAuthenticated,
  } = useChapterMastery(chapterId);

  const formulasQ = useQuery({
    queryKey: ["math", "formulas", "chapter", chapterId],
    queryFn: () => fetchMathFormulasForChapter(chapterId),
    enabled: !!chapterId,
  });
  const questionsQ = useQuery({
    queryKey: ["math", "questions", { chapterId }],
    queryFn: () => fetchMathQuestions({ chapterId }),
    enabled: !!chapterId,
  });
  const resourcesQ = useQuery({
    queryKey: ["library", "math", chapterId],
    queryFn: () =>
      fetchLibraryResources({ subjectId: "math", chapterId }),
    enabled: !!chapterId,
  });

  const seedMutation = useMutation({
    mutationFn: seedMathData,
    onSuccess: (counts) => {
      toast.success(
        `Seeded ${counts.chapters ?? 0} chapters, ${counts.questions ?? 0} questions`,
      );
      queryClient.invalidateQueries({ queryKey: ["math"] });
      queryClient.invalidateQueries({ queryKey: ["library", "math"] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Seeding failed";
      if (/permission|admin|unauth/i.test(msg)) {
        toast.error("Admin access required — opening import panel");
      } else {
        toast.error(msg);
      }
    },
  });

  if (isChapterLoading) {
    return (
      <DashboardLayout title="Loading…">
        <div className="mx-auto max-w-5xl space-y-4">
          <Skeleton className="h-32 w-full rounded-3xl" />
          <Skeleton className="h-10 w-72 rounded-full" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (isChapterMissing || !chapter || !mastery) {
    const isAdminError =
      seedMutation.isError &&
      /permission|admin|unauth/i.test(
        (seedMutation.error as Error)?.message ?? "",
      );
    return (
      <DashboardLayout title="Chapter not found">
        <div className="mx-auto max-w-md px-4 py-12">
          <div className="rounded-3xl border border-border/60 bg-card p-6 text-center shadow-card sm:p-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-warning/10">
              <AlertTriangle className="h-6 w-6 text-warning" />
            </div>
            <h1 className="mt-4 font-display text-xl font-bold sm:text-2xl">
              Chapter data isn't seeded yet
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              No <code className="font-mono text-xs">{chapterId}</code> doc was
              found in the Math intelligence collections. An admin can seed the
              starter chapters (Arithmetic Progressions, Triangles, Quadratic
              Equations) in one click.
            </p>
            {!isAuthenticated && (
              <Badge
                variant="outline"
                className="mt-3 rounded-full text-[10px]"
              >
                Sign in to track mastery
              </Badge>
            )}
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/subjects/$subjectId" params={{ subjectId: "math" }}>
                  Back to Math
                </Link>
              </Button>
              {isAdminError ? (
                <Button asChild className="rounded-full">
                  <Link to="/admin/import">Open import panel</Link>
                </Button>
              ) : (
                <Button
                  className="rounded-full"
                  onClick={() => seedMutation.mutate()}
                  disabled={seedMutation.isPending}
                >
                  {seedMutation.isPending ? (
                    <>
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      Seeding…
                    </>
                  ) : (
                    "Seed Math data"
                  )}
                </Button>
              )}
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Seeding is admin-only and enforced by Firestore security rules.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const tier = tierFor(mastery.mastery);
  const all = resourcesQ.data ?? [];
  const ktbs = all.filter((r) => r.tags?.includes("ktbs"));
  const ncert = all.filter((r) => r.tags?.includes("ncert"));
  const otherResources = all.filter(
    (r) => !r.tags?.includes("ktbs") && !r.tags?.includes("ncert"),
  );

  const pyqs = (questionsQ.data ?? []).filter(
    (q) => q.metadata.isRepeatedBoardQ || q.metadata.boardFrequency > 0,
  );
  const mcqs = (questionsQ.data ?? []).filter((q) => q.questionType === "mcq");
  const formulas = formulasQ.data ?? [];

  return (
    <DashboardLayout title={chapter.title}>
      <div className="mx-auto max-w-5xl space-y-4">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1 text-xs text-muted-foreground"
        >
          <Link to="/" className="hover:text-foreground">
            Dashboard
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link
            to="/subjects/$subjectId"
            params={{ subjectId: "math" }}
            className="hover:text-foreground"
          >
            Math
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="truncate text-foreground">{chapter.title}</span>
        </nav>

        {/* Intelligence header */}
        <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                Chapter {chapter.chapterNumber}
                <Badge
                  variant="outline"
                  className={`rounded-full ${tier.bg} ${tier.tone} border-transparent`}
                >
                  {tier.label}
                </Badge>
              </div>
              <h1 className="font-display text-2xl font-bold tracking-tight">
                {chapter.title}
              </h1>
              {chapter.titleKn && (
                <p className="text-sm text-muted-foreground">{chapter.titleKn}</p>
              )}
              {!isAuthenticated && (
                <Badge
                  variant="outline"
                  className="mt-2 rounded-full text-[10px]"
                >
                  Sign in to track mastery
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
              <IntelStat
                label="Mastery"
                value={`${Math.round(mastery.mastery)}%`}
              />
              <IntelStat
                label="Predicted"
                value={`${mastery.predictedMarks}m`}
                hint="Board marks"
              />
              <IntelStat
                label="Board weight"
                value={`${chapter.boardWeight}%`}
              />
              <IntelStat label="Concepts" value={`${chapter.keyConcepts.length}`} />
            </div>
          </div>

          <div className="mt-4">
            <Progress value={mastery.mastery} className="h-2" />
            <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
              <span>{tier.label} tier</span>
              <span>
                {mastery.signalCount}/4 signals · updated{" "}
                {new Date(mastery.lastUpdated).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="learn" className="w-full">
          <TabsList className="rounded-full flex flex-wrap">
            <TabsTrigger value="learn" className="rounded-full gap-1.5">
              <BookOpen className="h-3.5 w-3.5" /> Learn
            </TabsTrigger>
            <TabsTrigger value="practice" className="rounded-full gap-1.5">
              <Brain className="h-3.5 w-3.5" /> Practice
            </TabsTrigger>
            <TabsTrigger value="test" className="rounded-full gap-1.5">
              <Target className="h-3.5 w-3.5" /> Test
            </TabsTrigger>
            <TabsTrigger value="evaluate" className="rounded-full gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Evaluate
            </TabsTrigger>
            <TabsTrigger value="improve" className="rounded-full gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" /> Improve
            </TabsTrigger>
          </TabsList>

          <TabsContent value="learn" className="mt-4 space-y-4">
            <LearnTab
              chapterTitle={chapter.title}
              ktbs={ktbs}
              ncert={ncert}
              other={otherResources}
              formulas={formulas}
              keyConcepts={chapter.keyConcepts}
            />
          </TabsContent>

          <TabsContent value="practice" className="mt-4 space-y-4">
            <PracticeTab
              chapterTitle={chapter.title}
              pyqs={pyqs}
              mcqs={mcqs}
            />
          </TabsContent>

          <TabsContent value="test" className="mt-4 space-y-4">
            <TestTab
              chapterId={chapter.id}
              chapterTitle={chapter.title}
              questionCount={questionsQ.data?.length ?? 0}
            />
          </TabsContent>

          <TabsContent value="evaluate" className="mt-4 space-y-4">
            <EvaluateTab
              chapterId={chapter.id}
              chapterTitle={chapter.title}
              evaluationScore={mastery.breakdown.evaluation}
            />
          </TabsContent>

          <TabsContent value="improve" className="mt-4 space-y-4">
            <ImproveTab mastery={mastery} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function IntelStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/60 p-2 text-center">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="font-display text-lg font-bold leading-tight">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

/* ---------------- Tabs ---------------- */

function LearnTab({
  chapterTitle,
  ktbs,
  ncert,
  other,
  formulas,
  keyConcepts,
}: {
  chapterTitle: string;
  ktbs: LibraryResourceDoc[];
  ncert: LibraryResourceDoc[];
  other: LibraryResourceDoc[];
  formulas: MathFormulaDoc[];
  keyConcepts: string[];
}) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <ResourceCard
          title="KTBS textbook"
          subtitle="Karnataka State Board"
          resources={ktbs}
          chapterTitle={chapterTitle}
        />
        <ResourceCard
          title="NCERT textbook"
          subtitle="National curriculum"
          resources={ncert}
          chapterTitle={chapterTitle}
        />
      </div>

      {other.length > 0 && (
        <ResourceCard
          title="Other references"
          subtitle="Notes, worksheets and more"
          resources={other}
          chapterTitle={chapterTitle}
        />
      )}

      <div className="rounded-2xl border border-border/60 bg-card p-5">
        <div className="flex items-center gap-2">
          <Sigma className="h-4 w-4 text-brand" />
          <h3 className="font-display font-semibold">Chapter formulas</h3>
          <Badge variant="outline" className="rounded-full text-[10px]">
            {formulas.length}
          </Badge>
        </div>
        {formulas.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No formulas indexed for this chapter yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {formulas.map((f) => (
              <li
                key={f.id}
                className="rounded-xl border border-border/60 bg-background/60 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{f.label}</div>
                    <div className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                      {f.expression}
                    </div>
                  </div>
                  <Badge variant="outline" className="rounded-full text-[10px]">
                    {f.category}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {keyConcepts.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand" />
            <h3 className="font-display font-semibold">Key concepts</h3>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {keyConcepts.map((c) => (
              <Badge
                key={c}
                variant="outline"
                className="rounded-full bg-brand/5"
              >
                {c}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function ResourceCard({
  title,
  subtitle,
  resources,
  chapterTitle,
}: {
  title: string;
  subtitle: string;
  resources: LibraryResourceDoc[];
  chapterTitle: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-brand" />
        <div>
          <h3 className="font-display font-semibold leading-tight">{title}</h3>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {resources.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          No {title.toLowerCase()} linked for this chapter yet.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {resources.slice(0, 6).map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/60 p-2"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{r.title}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {r.language?.toUpperCase()} · {r.year ?? "—"}
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 rounded-full text-[11px]"
                  onClick={() => {
                    const ok = addToTodayPlan({
                      subject: "Math",
                      task: `Read — ${chapterTitle} (${r.title})`,
                      durationMin: 30,
                      link: r.url,
                    });
                    toast[ok ? "success" : "info"](
                      ok ? "Added to today's plan" : "Already on today's plan",
                    );
                  }}
                >
                  <CalendarPlus className="h-3 w-3" /> Plan
                </Button>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 rounded-full text-[11px]"
                >
                  <a href={r.url} target="_blank" rel="noreferrer">
                    Open <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PracticeTab({
  chapterTitle,
  pyqs,
  mcqs,
}: {
  chapterTitle: string;
  pyqs: MathQuestionDoc[];
  mcqs: MathQuestionDoc[];
}) {
  return (
    <>
      <div className="rounded-2xl border border-border/60 bg-card p-5">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-brand" />
          <h3 className="font-display font-semibold">
            Previous-year questions
          </h3>
          <Badge variant="outline" className="rounded-full text-[10px]">
            {pyqs.length}
          </Badge>
        </div>
        {pyqs.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No PYQs indexed for this chapter yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {pyqs.slice(0, 6).map((q) => (
              <QuestionRow
                key={q.id}
                q={q}
                chapterTitle={chapterTitle}
                kind="PYQ"
              />
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand" />
          <h3 className="font-display font-semibold">MCQ bank</h3>
          <Badge variant="outline" className="rounded-full text-[10px]">
            {mcqs.length}
          </Badge>
        </div>
        {mcqs.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No MCQs indexed for this chapter yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {mcqs.slice(0, 6).map((q) => (
              <QuestionRow
                key={q.id}
                q={q}
                chapterTitle={chapterTitle}
                kind="MCQ"
              />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function QuestionRow({
  q,
  chapterTitle,
  kind,
}: {
  q: MathQuestionDoc;
  chapterTitle: string;
  kind: string;
}) {
  return (
    <li className="rounded-xl border border-border/60 bg-background/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">
            {kind} · {q.marks}m · {q.difficulty}
            {q.metadata.boardFrequency > 0 &&
              ` · seen ×${q.metadata.boardFrequency}`}
          </div>
          <div className="mt-1 text-sm">{q.statement}</div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 shrink-0 gap-1 rounded-full text-[11px]"
          onClick={() => {
            const ok = addToTodayPlan({
              subject: "Math",
              task: `Practice — ${chapterTitle}: ${q.statement.slice(0, 60)}`,
              durationMin: Math.max(5, q.metadata.estimatedSolvingTime / 60),
            });
            toast[ok ? "success" : "info"](
              ok ? "Added to today's plan" : "Already on today's plan",
            );
          }}
        >
          <CalendarPlus className="h-3 w-3" /> Plan
        </Button>
      </div>
    </li>
  );
}

function TestTab({
  chapterId,
  chapterTitle,
  questionCount,
}: {
  chapterId: string;
  chapterTitle: string;
  questionCount: number;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-brand" />
        <h3 className="font-display font-semibold">Chapter mock test</h3>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Board-style blueprint scoped to <strong>{chapterTitle}</strong>. Uses
        the {questionCount} indexed question
        {questionCount === 1 ? "" : "s"} from the math bank, prioritising
        board-repeated and important items.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild className="rounded-full gap-1.5">
          <Link to="/exams">
            <Target className="h-3.5 w-3.5" /> Open mock exam library
          </Link>
        </Button>
        <Button
          variant="outline"
          className="rounded-full gap-1.5"
          onClick={() => {
            const ok = addToTodayPlan({
              subject: "Math",
              task: `Mock test — ${chapterTitle}`,
              durationMin: 45,
            });
            toast[ok ? "success" : "info"](
              ok ? "Mock test added to today's plan" : "Already on today's plan",
            );
          }}
        >
          <CalendarPlus className="h-3.5 w-3.5" /> Schedule for today
        </Button>
      </div>
    </div>
  );
}

function EvaluateTab({
  chapterId,
  chapterTitle,
  evaluationScore,
}: {
  chapterId: string;
  chapterTitle: string;
  evaluationScore: number | null;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-brand" />
        <h3 className="font-display font-semibold">AI answer evaluation</h3>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Upload a photo of your handwritten answers. The OCR + rubric grader
        will score every step, surface weak concepts and feed your mastery.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          {evaluationScore === null
            ? "No evaluations yet for this chapter."
            : `Average so far: ${Math.round(evaluationScore)}%`}
        </div>
        <div className="flex gap-2">
          <UploadAnswerButton
            context={{
              type: "chapter",
              refId: chapterId,
              subjectId: "math",
              chapterId,
              label: `Math · ${chapterTitle}`,
            }}
            label="Upload answers"
          />
          <Button asChild variant="outline" className="rounded-full gap-1.5">
            <Link to="/answer-uploads">View history</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function ImproveTab({
  mastery,
}: {
  mastery: ReturnType<typeof tierFor> extends never
    ? never
    : import("@/lib/math-intelligence/mastery-aggregator").ChapterMastery;
}) {
  const recs = useMemo(() => {
    const list: { title: string; reason: string; icon: typeof Lightbulb }[] = [];
    if (mastery.breakdown.quiz === null)
      list.push({
        title: "Take a chapter quiz",
        reason: "No quiz signal yet — build a baseline.",
        icon: Brain,
      });
    if (mastery.breakdown.evaluation === null)
      list.push({
        title: "Upload a written answer",
        reason: "OCR evaluation adds 25% of mastery weight.",
        icon: FileText,
      });
    if (mastery.breakdown.formula !== null && mastery.breakdown.formula < 70)
      list.push({
        title: "Revise formulas",
        reason: `Formula accuracy is ${Math.round(mastery.breakdown.formula)}%.`,
        icon: Sigma,
      });
    if (mastery.breakdown.mockExam !== null && mastery.breakdown.mockExam < 60)
      list.push({
        title: "Retake a math mock exam",
        reason: "Recent mock-exam math score is below target.",
        icon: Target,
      });
    if (list.length === 0)
      list.push({
        title: "Lock it in",
        reason: "Strong mastery — schedule a spaced revision next week.",
        icon: ThumbsUp,
      });
    return list;
  }, [mastery]);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <BreakdownCard label="Quiz / MCQ" value={mastery.breakdown.quiz} />
        <BreakdownCard label="Mock exam" value={mastery.breakdown.mockExam} />
        <BreakdownCard label="OCR evaluation" value={mastery.breakdown.evaluation} />
        <BreakdownCard label="Formula recall" value={mastery.breakdown.formula} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h3 className="font-display font-semibold">Weak concepts</h3>
          </div>
          {mastery.weakConcepts.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              None flagged yet — keep practicing.
            </p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2">
              {mastery.weakConcepts.map((c) => (
                <Badge
                  key={c}
                  variant="outline"
                  className="rounded-full border-destructive/30 bg-destructive/5 text-destructive"
                >
                  {c}
                </Badge>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <div className="flex items-center gap-2">
            <ThumbsUp className="h-4 w-4 text-success" />
            <h3 className="font-display font-semibold">Strong concepts</h3>
          </div>
          {mastery.strongConcepts.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No mastered concepts yet.
            </p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2">
              {mastery.strongConcepts.map((c) => (
                <Badge
                  key={c}
                  variant="outline"
                  className="rounded-full border-success/30 bg-success/5 text-success"
                >
                  {c}
                </Badge>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-5">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-warning" />
          <h3 className="font-display font-semibold">Recommended next steps</h3>
        </div>
        <ul className="mt-3 space-y-2">
          {recs.map((r) => (
            <li
              key={r.title}
              className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/60 p-3"
            >
              <r.icon className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <div>
                <div className="text-sm font-medium">{r.title}</div>
                <div className="text-[11px] text-muted-foreground">
                  {r.reason}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function BreakdownCard({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-display text-xl font-bold">
        {value === null ? "—" : `${Math.round(value)}%`}
      </div>
      <Progress
        value={value ?? 0}
        className={`mt-2 h-1.5 ${value === null ? "opacity-30" : ""}`}
      />
    </div>
  );
}
