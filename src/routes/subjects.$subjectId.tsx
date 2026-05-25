import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Circle,
  Sparkles,
  ThumbsUp,
  AlertTriangle,
  Brain,
  RotateCcw,
  ArrowRight,
  Lightbulb,
  Trophy,
  Flame,
  XCircle,
} from "lucide-react";
import { Clock, Map as MapIcon, Landmark } from "lucide-react";
import { type MCQ } from "@/lib/mock-data";
import { fetchChapters, fetchSubject } from "@/integrations/firebase/subjects";
import type { ChapterDoc, SubjectDoc, MathChapterDoc } from "@/integrations/firebase/types";
import { fetchMathChapters } from "@/integrations/firebase/services";
import { toast } from "sonner";
import { ChapterResources } from "@/components/chapter-resources";
import { useAllChapterMastery } from "@/hooks/use-math-mastery";
import { tierFor } from "@/lib/math-intelligence/mastery-tiers";
import { UploadAnswerButton } from "@/components/answer-upload/upload-answer-button";
import { Library, Sigma } from "lucide-react";
import { ExternalLink } from "lucide-react";
import { loadChapter, loadManifest } from "@/lib/contentLoader";
import { subjectMockExamId } from "@/lib/content-exam-builder";
import { GraduationCap, ListChecks } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  normalizeChapterData,
  mapContentMcqs,
  type NormalizedChapter,
  type ContentFormula,
  type ContentResource,
  type ContentImportantDate,
  type ContentKeyTerm,
  type ContentMap,
} from "@/lib/normalizeChapterData";

type ManifestChapter = {
  id: string;
  status?: string;
  chapterNumber?: number;
  title?: string;
  difficulty?: string;
  mcqCount?: number;
  exerciseCount?: number;
  section?: string;
  sectionKn?: string;
};

type ManifestDoc = { chapters?: ManifestChapter[] };

const MATH_SUBJECT_IDS = new Set(["mathematics", "math"]);
const SCIENCE_SUBJECT_IDS = new Set(["science"]);
const SOCIAL_SUBJECT_IDS = new Set(["social", "social-science", "socialscience"]);

function contentFolderFor(subjectId: string): string | null {
  if (MATH_SUBJECT_IDS.has(subjectId)) return "mathematics";
  if (SCIENCE_SUBJECT_IDS.has(subjectId)) return "science";
  if (SOCIAL_SUBJECT_IDS.has(subjectId)) return "social-science";
  return null;
}

/**
 * Map the URL subject id (which may be "math", "mathematics",
 * "social-science", etc.) to the runtime id used by
 * `content-question-index` / `subjectMockExamId` ("math" | "science" | "social").
 */
function runtimeSubjectIdFor(subjectId: string): string | null {
  if (MATH_SUBJECT_IDS.has(subjectId)) return "math";
  if (SCIENCE_SUBJECT_IDS.has(subjectId)) return "science";
  if (SOCIAL_SUBJECT_IDS.has(subjectId)) return "social";
  return null;
}

export const Route = createFileRoute("/subjects/$subjectId")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.subjectId} — VidyaPath` },
      {
        name: "description",
        content: `Chapter progress, weak/strong topics and practice MCQs for Karnataka SSLC.`,
      },
    ],
  }),
  notFoundComponent: () => (
    <DashboardLayout title="Not found">
      <div className="mx-auto max-w-lg py-24 text-center">
        <h1 className="font-display text-2xl font-bold">Subject not found</h1>
        <Button asChild className="mt-4 rounded-full">
          <Link to="/subjects">Back to subjects</Link>
        </Button>
      </div>
    </DashboardLayout>
  ),
  errorComponent: ({ error }) => {
    // Log internal details to the console only — never render raw SDK errors.
    if (typeof console !== "undefined") console.error("subject load failed", error);
    return (
      <DashboardLayout title="Error">
        <div className="mx-auto max-w-lg py-24 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-3 font-display text-2xl font-bold">Couldn't load subject</h1>
          <p className="mt-1 text-sm text-muted-foreground break-words">
            Unable to load this subject. Please try again later.
          </p>
          <Button asChild className="mt-4 rounded-full">
            <Link to="/subjects">Back to subjects</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  },
  component: SubjectDetailPage,
});

function SubjectDetailPage() {
  const { subjectId } = Route.useParams();
  const navigate = useNavigate();
  const contentFolder = contentFolderFor(subjectId);
  const isContentDriven = contentFolder != null;

  const [subjectQuery, chaptersQuery, mathChaptersQuery] = useQueries({
    queries: [
      {
        queryKey: ["subject", subjectId],
        queryFn: () => fetchSubject(subjectId),
      },
      {
        queryKey: ["chapters", subjectId],
        queryFn: () => fetchChapters(subjectId),
      },
      {
        queryKey: ["math", "chapters"],
        queryFn: fetchMathChapters,
        enabled: subjectId === "math",
        staleTime: 5 * 60 * 1000,
      },
    ],
  });

  const manifestQuery = useQuery({
    queryKey: ["content", "manifest", contentFolder ?? "none"],
    queryFn: () => loadManifest(contentFolder ?? undefined) as Promise<ManifestDoc>,
    enabled: isContentDriven,
    staleTime: 60 * 60 * 1000,
  });

  const readyChapters = useMemo<ManifestChapter[]>(() => {
    const list = ((manifestQuery.data as ManifestDoc | undefined)?.chapters ?? []) as ManifestChapter[];
    return list
      .filter((c) => c.status === "ready")
      .sort((a, b) => (a.chapterNumber ?? 0) - (b.chapterNumber ?? 0));
  }, [manifestQuery.data]);

  const readyChapterId = readyChapters[0]?.id ?? null;

  // Load every ready chapter in parallel; loadChapter is already cached.
  const chapterQueries = useQueries({
    queries: readyChapters.map((c) => ({
      queryKey: ["content", "chapter", contentFolder ?? "none", c.id],
      queryFn: () => loadChapter(contentFolder ?? "", c.id),
      enabled: isContentDriven && contentFolder != null,
      staleTime: 60 * 60 * 1000,
    })),
  });

  const normalizedChapters = useMemo<NormalizedChapter[]>(() => {
    if (!isContentDriven) return [];
    return readyChapters.map((entry, i) => {
      const raw = chapterQueries[i]?.data;
      // Merge manifest skeleton with full chapter JSON when available.
      const merged = raw ? { ...entry, ...(raw as object) } : entry;
      return normalizeChapterData(merged);
    });
  }, [isContentDriven, readyChapters, chapterQueries]);

  const normalizedById = useMemo(() => {
    const map = new Map<string, NormalizedChapter>();
    for (const c of normalizedChapters) map.set(c.id, c);
    return map;
  }, [normalizedChapters]);

  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const [chapterDetailOpen, setChapterDetailOpen] = useState(false);
  const activeContentId =
    selectedContentId && normalizedById.has(selectedContentId)
      ? selectedContentId
      : (readyChapterId ?? null);
  const activeChapter = activeContentId
    ? normalizedById.get(activeContentId)
    : undefined;
  const anyChapterLoading = chapterQueries.some((q) => q.isLoading);

  if (subjectQuery.isLoading || chaptersQuery.isLoading) {
    return (
      <DashboardLayout title="Loading…">
        <div className="mx-auto max-w-3xl space-y-4">
          <Skeleton className="h-40 w-full rounded-3xl" />
          <Skeleton className="h-10 w-72 rounded-full" />
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (subjectQuery.isError || chaptersQuery.isError) {
    const err = (subjectQuery.error ?? chaptersQuery.error) as Error;
    console.error("subject inline load failed", err);
    return (
      <DashboardLayout title="Error">
        <div className="mx-auto max-w-lg py-24 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="mt-3 font-display text-2xl font-bold">Couldn't load this subject</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Unable to load this subject. Please try again later.
          </p>
          <Button asChild className="mt-4 rounded-full">
            <Link to="/subjects">Back to subjects</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const subject = subjectQuery.data as SubjectDoc | null;
  const rawChapters: ChapterDoc[] = chaptersQuery.data ?? [];
  const mathChapters = (mathChaptersQuery.data ?? []) as MathChapterDoc[];
  // For the Math subject, prefer the math-intelligence chapters so that the
  // chapter list's IDs match the Firestore docs that
  // /subjects/math/$chapterId reads from. Falls back to the generic chapters
  // when math intelligence has not been seeded yet.
  const chapters: ChapterDoc[] =
    subjectId === "math" && mathChapters.length > 0
      ? mathChapters.map((c, i) => ({
          id: c.id,
          subjectId: "math",
          title: c.title,
          titleKn: c.titleKn,
          progress: 0,
          done: false,
          difficulty:
            c.difficultyMix.hard + c.difficultyMix.hots >= 50
              ? "Hard"
              : c.difficultyMix.easy >= 50
                ? "Easy"
                : "Medium",
          order: c.chapterNumber ?? i,
          chapterNumber: c.chapterNumber,
          estimatedStudyTime: c.estimatedStudyTime,
          importantTopics: c.keyConcepts,
        }))
      : rawChapters;

  if (!subject) {
    return (
      <DashboardLayout title="Not found">
        <div className="mx-auto max-w-lg py-24 text-center">
          <h1 className="font-display text-2xl font-bold">Subject not found</h1>
          <Button asChild className="mt-4 rounded-full">
            <Link to="/subjects">Back to subjects</Link>
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const mcqs: MCQ[] = useMemo(() => {
    if (!isContentDriven || !activeChapter) return [];
    return mapContentMcqs(activeChapter.mcqs ?? [], activeChapter.title);
  }, [isContentDriven, activeChapter]);

  const manifestReady = useMemo(() => {
    if (!isContentDriven) return null;
    const list = ((manifestQuery.data as ManifestDoc | undefined)?.chapters ?? []) as ManifestChapter[];
    const ready = list.filter((c) => c.status === "ready").length;
    return ready > 0 ? ready : null;
  }, [isContentDriven, manifestQuery.data]);

  const doneChapters = chapters.filter((c) => c.done).length;
  const chapterCountDisplay =
    manifestReady != null
      ? `${manifestReady}/${manifestReady}`
      : `${doneChapters}/${chapters.length}`;
  const overallProgress = chapters.length
    ? Math.round(chapters.reduce((a, c) => a + c.progress, 0) / chapters.length)
    : subject.completion;

  const isSocial = SOCIAL_SUBJECT_IDS.has(subjectId);
  const manifestChaptersAll =
    ((manifestQuery.data as ManifestDoc | undefined)?.chapters ?? []) as ManifestChapter[];
  const HISTORY_SECTIONS = new Set(["History"]);
  const MAPS_SECTIONS = new Set(["Geography"]);
  const CIVICS_SECTIONS = new Set([
    "Political Science",
    "Sociology",
    "Economics",
    "Business Studies",
  ]);

  const readyIds = useMemo(
    () => new Set(manifestChaptersAll.filter((c) => c.status === "ready").map((c) => c.id)),
    [manifestChaptersAll],
  );
  const sectionById = useMemo(() => {
    const m = new Map<string, string | undefined>();
    for (const c of manifestChaptersAll) m.set(c.id, c.section);
    return m;
  }, [manifestChaptersAll]);

  // Decorate normalized chapters with section from manifest (chapter JSON
  // also carries `section`, but manifest is authoritative).
  const decoratedChapters = useMemo(
    () =>
      normalizedChapters.map((c) => ({
        ...c,
        section: c.section || sectionById.get(c.id),
      })),
    [normalizedChapters, sectionById],
  );

  const historyChapters = useMemo(
    () => decoratedChapters.filter((c) => c.section && HISTORY_SECTIONS.has(c.section)),
    [decoratedChapters],
  );
  const geographyChapters = useMemo(
    () => decoratedChapters.filter((c) => c.section && MAPS_SECTIONS.has(c.section)),
    [decoratedChapters],
  );
  const civicsChapters = useMemo(
    () => decoratedChapters.filter((c) => c.section && CIVICS_SECTIONS.has(c.section)),
    [decoratedChapters],
  );

  return (
    <DashboardLayout title={subject.name}>
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Header */}
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 rounded-full">
            <Link to="/subjects">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" /> All subjects
            </Link>
          </Button>

          <div
            className="relative overflow-hidden rounded-2xl p-4 md:p-5 text-white shadow-soft"
            style={{
              background: `linear-gradient(135deg, ${subject.color}, color-mix(in oklab, ${subject.color} 60%, var(--brand-glow)))`,
            }}
          >
            <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/15 blur-3xl" />
            <div className="relative flex flex-wrap items-center gap-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-3xl font-bold backdrop-blur">
                {subject.emoji}
              </div>
              <div className="flex-1 min-w-[180px]">
                <h1 className="font-display text-2xl md:text-[28px] font-bold tracking-tight">
                  {subject.name}
                </h1>
                {subject.nameKn && (
                  <p className="text-white/80">{subject.nameKn}</p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full sm:w-auto sm:min-w-[260px]">
                <HeaderStat label="Progress" value={`${overallProgress}%`} />
                <HeaderStat label="Chapters" value={chapterCountDisplay} />
                <HeaderStat label="Target" value={`${subject.target}%`} />
              </div>
            </div>
          </div>
        </div>

        {isSocial && chapterDetailOpen && activeChapter ? (
          <ChapterDetailView
            chapter={activeChapter}
            color={subject.color}
            onBack={() => setChapterDetailOpen(false)}
          />
        ) : (
        <Tabs defaultValue="chapters" className="w-full min-w-0">
          <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <TabsList className="h-auto min-w-max rounded-full w-max max-w-none flex-nowrap justify-start sm:w-auto sm:min-w-0 sm:max-w-full sm:flex-wrap sm:inline-flex">
            <TabsTrigger value="chapters" className="rounded-full gap-1.5">
              <BookOpen className="h-3.5 w-3.5" /> Chapters
            </TabsTrigger>
            {isSocial ? (
              <>
                <TabsTrigger value="timeline" className="rounded-full gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Timeline
                </TabsTrigger>
                <TabsTrigger value="maps" className="rounded-full gap-1.5">
                  <MapIcon className="h-3.5 w-3.5" /> Maps
                </TabsTrigger>
                <TabsTrigger value="civics" className="rounded-full gap-1.5">
                  <Landmark className="h-3.5 w-3.5" /> Civics
                </TabsTrigger>
                <TabsTrigger value="practice" className="rounded-full gap-1.5">
                  <Brain className="h-3.5 w-3.5" /> Practice
                </TabsTrigger>
              </>
            ) : (
              <>
                <TabsTrigger value="resources" className="rounded-full gap-1.5">
                  <Library className="h-3.5 w-3.5" /> Resources
                </TabsTrigger>
                {isContentDriven && (
                  <TabsTrigger value="formulas" className="rounded-full gap-1.5">
                    <Sigma className="h-3.5 w-3.5" /> Formulas
                  </TabsTrigger>
                )}
                <TabsTrigger value="topics" className="rounded-full gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> Topics
                </TabsTrigger>
                <TabsTrigger value="practice" className="rounded-full gap-1.5">
                  <Brain className="h-3.5 w-3.5" /> Practice MCQs
                </TabsTrigger>
              </>
            )}
          </TabsList>
          </div>

          {/* CHAPTERS */}
          <TabsContent value="chapters" className="mt-4">
            {isContentDriven && (manifestQuery.data as ManifestDoc | undefined)?.chapters ? (
              chapterDetailOpen && activeChapter ? (
                <ChapterDetailView
                  chapter={activeChapter}
                  color={subject.color}
                  onBack={() => setChapterDetailOpen(false)}
                />
              ) : (
                <ManifestChaptersGrid
                  chapters={(manifestQuery.data as ManifestDoc).chapters as ManifestChapter[]}
                  color={subject.color}
                  onSelect={(id) => {
                    if (isSocial) {
                      setSelectedContentId(id);
                      setChapterDetailOpen(true);
                    } else {
                      navigate({
                        to: "/subjects/$subjectId/topics/$chapterId",
                        params: { subjectId, chapterId: id },
                      });
                    }
                  }}
                />
              )
            ) : (
              <ChaptersSection
                chapters={chapters}
                color={subject.color}
                subjectId={subject.id}
              />
            )}
          </TabsContent>

          {/* RESOURCES */}
          {!isSocial && (
          <TabsContent value="resources" className="mt-4 space-y-4">
            {isContentDriven ? (
              <ContentChapterPane
                chapters={normalizedChapters}
                activeId={activeContentId}
                onSelect={setSelectedContentId}
                loading={anyChapterLoading}
                emptyMessage="No resources available for this chapter yet."
              >
                {(ch) => (
                  <ContentResourcesGrid resources={ch.resources ?? []} />
                )}
              </ContentChapterPane>
            ) : (
              <ResourcesSection chapters={chapters} />
            )}
          </TabsContent>
          )}


          {isContentDriven && !isSocial && (
            <TabsContent value="formulas" className="mt-4">
              <ChapterLinkGrid
                chapters={normalizedChapters}
                loading={anyChapterLoading}
                emptyMessage="No formulas available yet."
                buildTo={(id) => ({
                  to: "/subjects/$subjectId/formulas/$chapterId" as const,
                  params: { subjectId, chapterId: id },
                })}
                icon="formulas"
                color={subject.color}
              />
            </TabsContent>
          )}

          {/* TOPICS */}
          {!isSocial && (
          <TabsContent value="topics" className="mt-4">
            {isContentDriven ? (
              <div className="space-y-4">
                <ChapterLinkGrid
                  chapters={normalizedChapters}
                  loading={anyChapterLoading}
                  emptyMessage="No topics available yet."
                  buildTo={(id) => ({
                    to: "/subjects/$subjectId/topics/$chapterId" as const,
                    params: { subjectId, chapterId: id },
                  })}
                  icon="topics"
                  color={subject.color}
                />
                <TopicsSection
                  weak={subject.weakTopics}
                  strong={subject.strongTopics}
                  color={subject.color}
                />
              </div>
            ) : (
              <TopicsSection
                weak={subject.weakTopics}
                strong={subject.strongTopics}
                color={subject.color}
              />
            )}
          </TabsContent>
          )}

          {/* SOCIAL-SCIENCE: TIMELINE / MAPS / CIVICS */}
          {isSocial && (
            <>
              <TabsContent value="timeline" className="mt-4">
                <SocialTimelineView
                  chapters={historyChapters}
                  readyIds={readyIds}
                  color={subject.color}
                  loading={anyChapterLoading}
                  onSelect={(id) => {
                    setSelectedContentId(id);
                    setChapterDetailOpen(true);
                  }}
                />
              </TabsContent>

              <TabsContent value="maps" className="mt-4">
                <SocialMapsView
                  chapters={geographyChapters}
                  readyIds={readyIds}
                  color={subject.color}
                  loading={anyChapterLoading}
                  onSelect={(id) => {
                    setSelectedContentId(id);
                    setChapterDetailOpen(true);
                  }}
                />
              </TabsContent>

              <TabsContent value="civics" className="mt-4">
                <SocialCivicsView
                  chapters={civicsChapters}
                  readyIds={readyIds}
                  color={subject.color}
                  loading={anyChapterLoading}
                  onSelect={(id) => {
                    setSelectedContentId(id);
                    setChapterDetailOpen(true);
                  }}
                />
              </TabsContent>
            </>
          )}

          {/* PRACTICE */}
          <TabsContent value="practice" className="mt-4">
            {isContentDriven && runtimeSubjectIdFor(subjectId) && (
              <div className="mb-3 grid gap-2 sm:grid-cols-2">
                <Link
                  to="/exams/$examId"
                  params={{
                    examId: subjectMockExamId(runtimeSubjectIdFor(subjectId)!),
                  }}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card p-3 transition-colors hover:border-foreground/40"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <GraduationCap className="h-4 w-4" />
                      Start subject mock exam
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Blueprint-weighted paper · timed
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
                <Link
                  to="/quizzes"
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card p-3 transition-colors hover:border-foreground/40"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <ListChecks className="h-4 w-4" />
                      Browse chapter tests
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Easy · Board · Challenge levels
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </div>
            )}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/60 bg-card p-3">
              <div className="text-xs text-muted-foreground">
                Practicing on paper? Upload a photo of your answers.
              </div>
              <UploadAnswerButton
                context={{
                  type: "chapter",
                  refId: subject.id,
                  subjectId: subject.id,
                  label: `${subject.name} practice`,
                }}
                label="Upload answers"
              />
            </div>
            {isSocial ? (
              <SocialPracticeView
                chapters={decoratedChapters}
                color={subject.color}
                loading={anyChapterLoading}
              />
            ) : isContentDriven ? (
              <ContentChapterPane
                chapters={normalizedChapters}
                activeId={activeContentId}
                onSelect={setSelectedContentId}
                loading={anyChapterLoading}
                emptyMessage="MCQs for this chapter coming soon."
              >
                {() =>
                  mcqs.length > 0 ? (
                    <PracticeQuiz mcqs={mcqs} color={subject.color} />
                  ) : (
                    <div className="rounded-3xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
                      MCQs for this chapter coming soon.
                    </div>
                  )
                }
              </ContentChapterPane>
            ) : (
              <div className="rounded-3xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
                MCQs for this subject coming soon.
              </div>
            )}
          </TabsContent>
        </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}

function HeaderStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/15 p-2 text-center backdrop-blur">
      <div className="text-[10px] uppercase tracking-widest text-white/70">{label}</div>
      <div className="font-display text-lg font-bold">{value}</div>
    </div>
  );
}

/* ---------------- Chapter link grid (formulas/topics tabs) ---------------- */

function ChapterLinkGrid({
  chapters,
  loading,
  emptyMessage,
  buildTo,
  icon,
  color,
}: {
  chapters: NormalizedChapter[];
  loading: boolean;
  emptyMessage: string;
  buildTo: (id: string) => {
    to:
      | "/subjects/$subjectId/formulas/$chapterId"
      | "/subjects/$subjectId/topics/$chapterId";
    params: { subjectId: string; chapterId: string };
  };
  icon: "formulas" | "topics";
  color: string;
}) {
  if (loading && chapters.length === 0) {
    return <Skeleton className="h-48 w-full rounded-2xl" />;
  }
  if (chapters.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }
  const Icon = icon === "formulas" ? Sigma : Sparkles;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {chapters.map((c, i) => (
        <Link
          key={c.id}
          {...buildTo(c.id)}
          className="group rounded-2xl border border-border/60 bg-card p-4 transition hover:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/40"
        >
          <div className="flex items-start gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand"
              style={{ color }}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-muted-foreground">
                Chapter {c.chapterNumber || i + 1}
              </div>
              <div className="font-display font-semibold">{c.title}</div>
              {icon === "formulas" ? (
                <div className="mt-1 text-xs text-muted-foreground">
                  {(c.formulas?.length ?? 0)} formulas
                </div>
              ) : (
                <div className="mt-1 text-xs text-muted-foreground">
                  {(c.learningPoints?.length ?? 0)} learning points ·{" "}
                  {(c.exercises?.length ?? 0)} exercises
                </div>
              )}
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" />
          </div>
        </Link>
      ))}
    </div>
  );
}

/* ---------------- Content Resources (from chapter JSON) ---------------- */

function ManifestChaptersGrid({
  chapters,
  color,
  onSelect,
}: {
  chapters: ManifestChapter[];
  color: string;
  onSelect: (id: string) => void;
}) {
  const sorted = [...chapters].sort(
    (a, b) => (a.chapterNumber ?? 0) - (b.chapterNumber ?? 0),
  );
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {sorted.map((c) => {
        const isReady = c.status === "ready";
        return (
          <div
            key={c.id}
            role={isReady ? "button" : undefined}
            tabIndex={isReady ? 0 : -1}
            onClick={() => isReady && onSelect(c.id)}
            onKeyDown={(e) => {
              if (isReady && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onSelect(c.id);
              }
            }}
            className={`rounded-2xl border p-4 transition ${
              isReady
                ? "border-border/60 bg-card hover:border-brand/40 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand/40"
                : "border-dashed border-border/60 bg-muted/30 opacity-75"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>Chapter {c.chapterNumber ?? "—"}</span>
                  {c.difficulty && (
                    <DifficultyBadge
                      level={
                        (c.difficulty.charAt(0).toUpperCase() +
                          c.difficulty.slice(1)) as ChapterDoc["difficulty"]
                      }
                    />
                  )}
                  {isReady ? (
                    <Badge
                      variant="outline"
                      className="h-4 rounded-full border-transparent bg-success/15 px-1.5 text-[9px] text-success"
                    >
                      Available
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="h-4 rounded-full border-transparent bg-muted px-1.5 text-[9px] text-muted-foreground"
                    >
                      Coming soon
                    </Badge>
                  )}
                </div>
                <div
                  className={`font-display font-semibold ${
                    isReady ? "" : "text-muted-foreground"
                  }`}
                  style={isReady ? { color } : undefined}
                >
                  {c.title ?? c.id}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                  <span>{c.mcqCount ?? 0} MCQs</span>
                  <span>·</span>
                  <span>{c.exerciseCount ?? 0} exercises</span>
                </div>
                <div className="mt-3">
                  <a
                    href="https://ktbs.kar.nic.in/new/index.html#!/textbook"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-2.5 py-1 text-[11px] font-medium text-foreground hover:border-brand/40 hover:text-brand transition"
                  >
                    <BookOpen className="h-3 w-3" />
                    Karnataka Textbook (KTBS)
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Social Science: Timeline / Maps / Civics / Practice ---------------- */

function SocialHeader({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: typeof Clock;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div
      className="rounded-2xl border border-border/60 p-4"
      style={{
        background: `linear-gradient(135deg, color-mix(in oklab, ${color} 14%, transparent), transparent)`,
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
          style={{ background: color }}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h2 className="font-display text-lg font-bold leading-tight">{title}</h2>
          <p className="text-xs text-muted-foreground leading-snug">{description}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function parseYear(y: string): number {
  // Handles "1498", "1757 AD", "c. 1600", "1857-58", "300 BC"
  const isBC = /b\.?c\.?/i.test(y);
  const m = y.match(/-?\d{1,4}/);
  if (!m) return Number.POSITIVE_INFINITY;
  const n = parseInt(m[0], 10);
  return isBC ? -n : n;
}

type AggregatedDate = ContentImportantDate & {
  chapterId: string;
  chapterTitle: string;
  chapterNumber: number;
};

function SocialTimelineView({
  chapters,
  readyIds,
  color,
  loading,
  onSelect,
}: {
  chapters: NormalizedChapter[];
  readyIds: Set<string>;
  color: string;
  loading: boolean;
  onSelect: (id: string) => void;
}) {
  const aggregated: AggregatedDate[] = useMemo(() => {
    const out: AggregatedDate[] = [];
    for (const c of chapters) {
      for (const d of c.importantDates ?? []) {
        out.push({
          ...d,
          chapterId: c.id,
          chapterTitle: c.title,
          chapterNumber: c.chapterNumber,
        });
      }
    }
    out.sort((a, b) => parseYear(a.year) - parseYear(b.year));
    return out;
  }, [chapters]);

  const sortedChapters = useMemo(
    () => [...chapters].sort((a, b) => a.chapterNumber - b.chapterNumber),
    [chapters],
  );

  return (
    <div className="space-y-4">
      <SocialHeader
        icon={Clock}
        title="Complete History Timeline"
        description="Syllabus-wide chronology aggregated across every History chapter — pulled live from the textbook JSON. Open a chapter for its focused timeline."
        color={color}
      />

      {loading && chapters.length === 0 ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : chapters.length === 0 ? (
        <EmptyBlock>No history chapters available yet.</EmptyBlock>
      ) : (
        <>
          {aggregated.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-brand" />
                <h3 className="font-display font-semibold">Key Dates & Events</h3>
                <Badge variant="outline" className="rounded-full text-[10px]">
                  {aggregated.length}
                </Badge>
              </div>
              <ol className="relative space-y-3 border-l border-border/60 pl-5">
                {aggregated.map((d, i) => (
                  <li key={`${d.chapterId}-${i}`} className="relative">
                    <span
                      className="absolute -left-[27px] top-2 flex h-3 w-3 items-center justify-center rounded-full ring-4 ring-background"
                      style={{ background: color }}
                    />
                    <button
                      type="button"
                      onClick={() => readyIds.has(d.chapterId) && onSelect(d.chapterId)}
                      className="block w-full text-left"
                    >
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span
                          className="font-display text-base font-bold"
                          style={{ color }}
                        >
                          {d.year}
                        </span>
                        <span className="text-sm text-foreground/90">{d.event}</span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        Ch {d.chapterNumber} · {d.chapterTitle}
                      </div>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div>
            <div className="mb-2 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-brand" />
              <h3 className="font-display font-semibold">Chapter chronology</h3>
            </div>
            <ol className="relative space-y-3 border-l border-border/60 pl-5">
              {sortedChapters.map((c) => {
                const isReady = readyIds.has(c.id);
                return (
                  <li key={c.id} className="relative">
                    <span
                      className="absolute -left-[27px] top-3 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-background"
                      style={{ background: isReady ? color : "var(--muted)" }}
                    />
                    <button
                      type="button"
                      disabled={!isReady}
                      onClick={() => isReady && onSelect(c.id)}
                      className={`w-full rounded-2xl border p-3 text-left transition ${
                        isReady
                          ? "border-border/60 bg-card hover:border-brand/40 cursor-pointer"
                          : "border-dashed border-border/60 bg-muted/30 opacity-75 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>Chapter {c.chapterNumber || "—"}</span>
                        <span>·</span>
                        <span>{c.importantDates.length} dates</span>
                        <span>·</span>
                        <span>{c.keyTerms.length} terms</span>
                      </div>
                      <div
                        className="font-display font-semibold"
                        style={isReady ? { color } : undefined}
                      >
                        {c.title}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        </>
      )}
    </div>
  );
}

function SocialMapsView({
  chapters,
  readyIds,
  color,
  loading,
  onSelect,
}: {
  chapters: NormalizedChapter[];
  readyIds: Set<string>;
  color: string;
  loading: boolean;
  onSelect: (id: string) => void;
}) {
  const sortedChapters = useMemo(
    () => [...chapters].sort((a, b) => a.chapterNumber - b.chapterNumber),
    [chapters],
  );

  return (
    <div className="space-y-4">
      <SocialHeader
        icon={MapIcon}
        title="Geography & Maps"
        description="Explore geography concepts visually."
        color={color}
      />

      <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-3 text-[11px] text-muted-foreground">
        Tap a chapter to open its map and key regions.
      </div>

      {loading && chapters.length === 0 ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : chapters.length === 0 ? (
        <EmptyBlock>No geography chapters available yet.</EmptyBlock>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {sortedChapters.map((c) => {
            const isReady = readyIds.has(c.id);
            const topTerms = (c.keyTerms ?? []).slice(0, 4);
            return (
              <button
                key={c.id}
                type="button"
                disabled={!isReady}
                onClick={() => isReady && onSelect(c.id)}
                className={`rounded-2xl border p-4 text-left transition ${
                  isReady
                    ? "border-border/60 bg-card hover:border-brand/40 cursor-pointer"
                    : "border-dashed border-border/60 bg-muted/30 opacity-75 cursor-not-allowed"
                }`}
              >
                {c.map?.image && (
                  <div className="mb-3 overflow-hidden rounded-xl border border-border/50 bg-muted/30">
                    <img
                      src={c.map.image}
                      alt={c.map.title || `${c.title} map`}
                      loading="lazy"
                      decoding="async"
                      className="h-32 w-full object-contain bg-white"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>Chapter {c.chapterNumber || "—"}</span>
                  <Badge
                    variant="outline"
                    className="h-4 rounded-full border-border/60 px-1.5 text-[9px]"
                  >
                    Geography
                  </Badge>
                  {c.map?.image && (
                    <Badge
                      variant="outline"
                      className="h-4 rounded-full border-brand/40 px-1.5 text-[9px] text-brand"
                    >
                      Map
                    </Badge>
                  )}
                </div>
                <div
                  className="font-display font-semibold"
                  style={isReady ? { color } : undefined}
                >
                  {c.title}
                </div>
                {c.map && c.map.topics.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {c.map.topics.slice(0, 4).map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] text-brand"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                {topTerms.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {topTerms.map((t) => (
                      <span
                        key={t.term}
                        className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {t.term}
                      </span>
                    ))}
                    {c.keyTerms.length > topTerms.length && (
                      <span className="text-[10px] text-muted-foreground">
                        +{c.keyTerms.length - topTerms.length} more
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChapterMap({
  chapter,
  color,
}: {
  chapter: NormalizedChapter;
  color: string;
}) {
  const map = chapter.map!;
  const chapterTitle = chapter.title;
  const [errored, setErrored] = useState(false);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);

  const labelMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of map.labels) {
      if (l.description) m.set(l.label.toLowerCase(), l.description);
    }
    return m;
  }, [map.labels]);

  const topicMcqs = useMemo(() => {
    if (!activeTopic) return [];
    const needle = activeTopic.toLowerCase();
    const tokens = needle.split(/\s+/).filter((t) => t.length > 2);
    const mcqs = mapContentMcqs(chapter.mcqs ?? [], chapter.title);
    const matches = mcqs.filter((q) => {
      const hay = [
        q.question,
        q.explanation ?? "",
        ...(q.options ?? []),
      ]
        .join(" ")
        .toLowerCase();
      if (hay.includes(needle)) return true;
      return tokens.some((t) => hay.includes(t));
    });
    return matches.length > 0 ? matches : mcqs.slice(0, 5);
  }, [activeTopic, chapter]);

  const topicExplanation = useMemo(() => {
    if (!activeTopic) return "";
    const direct = labelMap.get(activeTopic.toLowerCase());
    if (direct) return direct;
    const term = chapter.keyTerms.find(
      (t) => t.term.toLowerCase() === activeTopic.toLowerCase(),
    );
    if (term) return term.definition;
    return `Quick revision for "${activeTopic}" — review related MCQs below.`;
  }, [activeTopic, labelMap, chapter.keyTerms]);

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
      <div className="mb-3 flex items-center gap-2">
        <MapIcon className="h-4 w-4" style={{ color }} />
        <h3 className="font-display font-semibold">
          {map.title || "Chapter Map"}
        </h3>
        {map.topics.length > 0 && (
          <Badge variant="outline" className="rounded-full text-[10px]">
            {map.topics.length} topics
          </Badge>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border/50 bg-white">
        {errored ? (
          <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
            Map image unavailable
          </div>
        ) : (
          <img
            src={map.image}
            alt={map.title || `${chapterTitle} map`}
            loading="lazy"
            decoding="async"
            onError={() => setErrored(true)}
            className="max-h-[480px] w-full object-contain"
          />
        )}
      </div>

      {map.caption && (
        <p className="mt-2 text-[11px] text-muted-foreground">{map.caption}</p>
      )}

      {map.topics.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 text-[11px] font-medium text-muted-foreground">
            Tap a topic to revise & practice
          </div>
          <div className="flex flex-wrap gap-1">
            {map.topics.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setActiveTopic(t)}
                className="rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-medium text-brand transition hover:bg-brand/20 active:scale-95"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {map.labels.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 text-[11px] font-medium text-muted-foreground">
            Highlighted regions / labels
          </div>
          <ul className="grid gap-1 sm:grid-cols-2">
            {map.labels.map((l) => (
              <li
                key={l.label}
                className="rounded-lg border border-border/50 bg-muted/20 px-2 py-1 text-[11px] cursor-pointer hover:border-brand/40 hover:bg-brand/5 transition"
                onClick={() => setActiveTopic(l.label)}
              >
                <span className="font-semibold text-foreground">{l.label}</span>
                {l.description && (
                  <span className="text-muted-foreground"> — {l.description}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <TopicPracticeDialog
        topic={activeTopic}
        explanation={topicExplanation}
        mcqs={topicMcqs}
        onClose={() => setActiveTopic(null)}
        color={color}
      />
    </section>
  );
}

function TopicPracticeDialog({
  topic,
  explanation,
  mcqs,
  onClose,
  color,
}: {
  topic: string | null;
  explanation: string;
  mcqs: MCQ[];
  onClose: () => void;
  color: string;
}) {
  const [mode, setMode] = useState<"intro" | "practice" | "done">("intro");
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (topic) {
      setMode("intro");
      setIdx(0);
      setPicked(null);
      setRevealed(false);
      setScore(0);
    }
  }, [topic]);

  const q = mcqs[idx];

  function check() {
    if (picked === null || !q) return;
    const ok = picked === q.correctIndex;
    if (ok) setScore((s) => s + 1);
    setRevealed(true);
  }

  function next() {
    if (idx + 1 >= mcqs.length) {
      setMode("done");
      return;
    }
    setIdx((i) => i + 1);
    setPicked(null);
    setRevealed(false);
  }

  return (
    <Dialog open={!!topic} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="left-1/2 top-1/2 w-[calc(100vw-1rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-0 overflow-hidden p-0 sm:w-full">
        <DialogHeader className="p-4 pb-3 border-b border-border/60">
          <DialogTitle className="flex items-center gap-2 text-base">
            <MapIcon className="h-4 w-4" style={{ color }} />
            <span className="truncate">{topic}</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Quick explanation · {mcqs.length} related MCQ{mcqs.length === 1 ? "" : "s"}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto p-4 space-y-4">
          {mode === "intro" && (
            <>
              <p className="text-sm leading-relaxed text-foreground/90">
                {explanation}
              </p>
              {mcqs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                  No related MCQs in this chapter yet. Try another topic.
                </div>
              ) : (
                <>
                  <div className="text-[11px] font-medium text-muted-foreground">
                    Preview ({Math.min(3, mcqs.length)} of {mcqs.length})
                  </div>
                  <ul className="space-y-2">
                    {mcqs.slice(0, 3).map((m, i) => (
                      <li
                        key={m.id ?? i}
                        className="rounded-lg border border-border/50 bg-muted/20 p-2 text-xs leading-snug"
                      >
                        {m.question}
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => setMode("practice")}
                    className="w-full rounded-full"
                    style={{ background: color, color: "white" }}
                  >
                    Start quick practice →
                  </Button>
                </>
              )}
            </>
          )}

          {mode === "practice" && q && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  Question {idx + 1} / {mcqs.length}
                </span>
                <span>Score: {score}</span>
              </div>
              <div className="text-sm font-medium leading-snug">{q.question}</div>
              <div className="space-y-2">
                {q.options.map((opt, i) => {
                  const correctIdx = q.correctIndex;
                  const isPicked = picked === i;
                  const isCorrect = revealed && i === correctIdx;
                  const isWrong = revealed && isPicked && i !== correctIdx;
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={revealed}
                      onClick={() => setPicked(i)}
                      className={`w-full rounded-xl border px-3 py-2 text-left text-xs transition ${
                        isCorrect
                          ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                          : isWrong
                          ? "border-red-300 bg-red-50 text-red-900"
                          : isPicked
                          ? "border-brand bg-brand/10"
                          : "border-border/60 bg-card hover:border-brand/40"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {revealed && q.explanation && (
                <div className="rounded-lg border border-border/50 bg-muted/30 p-2 text-[11px] text-muted-foreground">
                  <strong className="text-foreground">Why:</strong> {q.explanation}
                </div>
              )}
              <div className="flex gap-2">
                {!revealed ? (
                  <Button
                    onClick={check}
                    disabled={picked === null}
                    className="flex-1 rounded-full"
                  >
                    Check
                  </Button>
                ) : (
                  <Button onClick={next} className="flex-1 rounded-full">
                    {idx + 1 >= mcqs.length ? "Finish" : "Next →"}
                  </Button>
                )}
              </div>
            </div>
          )}

          {mode === "done" && (
            <div className="space-y-3 text-center py-4">
              <Trophy className="h-10 w-10 text-amber-500 mx-auto" />
              <div className="font-display text-lg font-semibold">
                {score} / {mcqs.length} correct
              </div>
              <p className="text-xs text-muted-foreground">
                Topic: {topic}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 rounded-full"
                  onClick={() => {
                    setMode("practice");
                    setIdx(0);
                    setPicked(null);
                    setRevealed(false);
                    setScore(0);
                  }}
                >
                  <RotateCcw className="mr-1 h-3.5 w-3.5" /> Retry
                </Button>
                <Button onClick={onClose} className="flex-1 rounded-full">
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const CIVICS_GROUPS: { key: string; label: string }[] = [
  { key: "Political Science", label: "Political Science" },
  { key: "Sociology", label: "Sociology" },
  { key: "Economics", label: "Economics" },
  { key: "Business Studies", label: "Business Studies" },
];

function SocialCivicsView({
  chapters,
  readyIds,
  color,
  loading,
  onSelect,
}: {
  chapters: NormalizedChapter[];
  readyIds: Set<string>;
  color: string;
  loading: boolean;
  onSelect: (id: string) => void;
}) {
  const grouped = useMemo(() => {
    const m = new Map<string, NormalizedChapter[]>();
    for (const g of CIVICS_GROUPS) m.set(g.key, []);
    for (const c of chapters) {
      if (c.section && m.has(c.section)) m.get(c.section)!.push(c);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.chapterNumber - b.chapterNumber);
    return m;
  }, [chapters]);

  return (
    <div className="space-y-4">
      <SocialHeader
        icon={Landmark}
        title="Civics, Society & Economy"
        description="Governance, social structures, economic life and entrepreneurship — grouped by discipline."
        color={color}
      />

      {loading && chapters.length === 0 ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : chapters.length === 0 ? (
        <EmptyBlock>No civics chapters available yet.</EmptyBlock>
      ) : (
        CIVICS_GROUPS.map((g) => {
          const items = grouped.get(g.key) ?? [];
          if (items.length === 0) return null;
          return (
            <div key={g.key} className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {g.label}
                </h3>
                <Badge variant="outline" className="rounded-full text-[10px]">
                  {items.length}
                </Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {items.map((c) => {
                  const isReady = readyIds.has(c.id);
                  const topTerms = (c.keyTerms ?? []).slice(0, 3);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      disabled={!isReady}
                      onClick={() => isReady && onSelect(c.id)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        isReady
                          ? "border-border/60 bg-card hover:border-brand/40 cursor-pointer"
                          : "border-dashed border-border/60 bg-muted/30 opacity-75 cursor-not-allowed"
                      }`}
                    >
                      <div className="text-[11px] text-muted-foreground">
                        Chapter {c.chapterNumber || "—"}
                      </div>
                      <div
                        className="font-display font-semibold"
                        style={isReady ? { color } : undefined}
                      >
                        {c.title}
                      </div>
                      {topTerms.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {topTerms.map((t) => (
                            <div
                              key={t.term}
                              className="text-[11px] text-muted-foreground leading-snug"
                            >
                              <span className="font-semibold text-foreground/80">
                                {t.term}:
                              </span>{" "}
                              {t.definition.length > 90
                                ? `${t.definition.slice(0, 90)}…`
                                : t.definition}
                            </div>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

type SocialPracticeBank = "mcq" | "one_mark" | "two_mark" | "three_mark";

function SocialPracticeView({
  chapters,
  color,
  loading,
}: {
  chapters: NormalizedChapter[];
  color: string;
  loading: boolean;
}) {
  const allMcqs = useMemo<MCQ[]>(() => {
    const out: MCQ[] = [];
    for (const c of chapters) out.push(...mapContentMcqs(c.mcqs ?? [], c.title));
    return out;
  }, [chapters]);

  const banks = useMemo(() => {
    const groups: Record<Exclude<SocialPracticeBank, "mcq">, Array<{
      chapterTitle: string;
      chapterNumber: number;
      question: string;
      answer?: string;
      id: string;
    }>> = {
      one_mark: [],
      two_mark: [],
      three_mark: [],
    };
    for (const c of chapters) {
      for (const ex of c.exercises ?? []) {
        const t = ex.type;
        if (t === "one_mark" || t === "two_mark" || t === "three_mark") {
          groups[t].push({
            id: `${c.id}-${ex.id}`,
            question: ex.question,
            answer: ex.answer,
            chapterTitle: c.title,
            chapterNumber: c.chapterNumber,
          });
        }
      }
    }
    return groups;
  }, [chapters]);

  if (loading && chapters.length === 0) {
    return <Skeleton className="h-40 w-full rounded-2xl" />;
  }

  const totalCount =
    allMcqs.length + banks.one_mark.length + banks.two_mark.length + banks.three_mark.length;
  if (totalCount === 0) {
    return <EmptyBlock>Practice content for Social Science coming soon.</EmptyBlock>;
  }

  return (
    <Tabs defaultValue="mcq" className="w-full min-w-0">
      <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      <TabsList className="h-auto min-w-max rounded-full w-max max-w-none flex-nowrap justify-start sm:w-auto sm:min-w-0 sm:max-w-full sm:flex-wrap sm:inline-flex">
        <TabsTrigger value="mcq" className="rounded-full">
          MCQs <span className="ml-1 text-[10px] text-muted-foreground">({allMcqs.length})</span>
        </TabsTrigger>
        <TabsTrigger value="one_mark" className="rounded-full">
          1-mark <span className="ml-1 text-[10px] text-muted-foreground">({banks.one_mark.length})</span>
        </TabsTrigger>
        <TabsTrigger value="two_mark" className="rounded-full">
          2-mark <span className="ml-1 text-[10px] text-muted-foreground">({banks.two_mark.length})</span>
        </TabsTrigger>
        <TabsTrigger value="three_mark" className="rounded-full">
          3-mark <span className="ml-1 text-[10px] text-muted-foreground">({banks.three_mark.length})</span>
        </TabsTrigger>
      </TabsList>
      </div>

      <TabsContent value="mcq" className="mt-4">
        {allMcqs.length > 0 ? (
          <PracticeQuiz mcqs={allMcqs} color={color} />
        ) : (
          <EmptyBlock>MCQs coming soon.</EmptyBlock>
        )}
      </TabsContent>

      {(["one_mark", "two_mark", "three_mark"] as const).map((bank) => (
        <TabsContent key={bank} value={bank} className="mt-4">
          <WrittenAnswerBank items={banks[bank]} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function WrittenAnswerBank({
  items,
}: {
  items: Array<{
    id: string;
    question: string;
    answer?: string;
    chapterTitle: string;
    chapterNumber: number;
  }>;
}) {
  if (items.length === 0) {
    return <EmptyBlock>No questions in this set yet.</EmptyBlock>;
  }
  return (
    <ol className="space-y-2">
      {items.map((q, i) => (
        <li
          key={q.id}
          className="rounded-2xl border border-border/60 bg-card p-3 text-sm"
        >
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[11px] text-muted-foreground">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-foreground/90">{q.question}</div>
              <div className="mt-1 text-[10px] text-muted-foreground">
                Ch {q.chapterNumber} · {q.chapterTitle}
              </div>
              {q.answer && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] font-medium text-brand">
                    Show answer
                  </summary>
                  <div className="mt-1 whitespace-pre-line text-xs text-muted-foreground">
                    {q.answer}
                  </div>
                </details>
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ---------------- Chapter Detail View (in Chapters tab) ---------------- */

function ChapterDetailView({
  chapter,
  color,
  onBack,
}: {
  chapter: NormalizedChapter;
  color: string;
  onBack: () => void;
}) {
  return <ChapterDetailViewInner chapter={chapter} color={color} onBack={onBack} />;
}

function ChapterTimeline({
  chapter,
  color,
}: {
  chapter: NormalizedChapter;
  color: string;
}) {
  const sorted = useMemo(
    () =>
      [...chapter.importantDates].sort(
        (a, b) => parseYear(a.year) - parseYear(b.year),
      ),
    [chapter],
  );
  if (sorted.length === 0) return null;
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4 text-brand" />
        <h3 className="font-display font-semibold">Chapter Timeline</h3>
        <Badge variant="outline" className="rounded-full text-[10px]">
          {sorted.length}
        </Badge>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Events and dates from <span className="font-medium">{chapter.title}</span> only.
      </p>
      <ol className="relative space-y-3 border-l border-border/60 pl-5">
        {sorted.map((d, i) => (
          <li key={`${chapter.id}-tl-${i}`} className="relative">
            <span
              className="absolute -left-[27px] top-2 flex h-3 w-3 items-center justify-center rounded-full ring-4 ring-background"
              style={{ background: color }}
            />
            <div className="flex flex-wrap items-baseline gap-2">
              <span
                className="font-display text-base font-bold"
                style={{ color }}
              >
                {d.year}
              </span>
              <span className="text-sm text-foreground/90">{d.event}</span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ChapterDetailViewInner({
  chapter,
  color,
  onBack,
}: {
  chapter: NormalizedChapter;
  color: string;
  onBack: () => void;
}) {
  const mcqs = useMemo(
    () => mapContentMcqs(chapter.mcqs ?? [], chapter.title),
    [chapter],
  );
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="-ml-2 rounded-full"
        >
          <ArrowLeft className="mr-1 h-3.5 w-3.5" /> All chapters
        </Button>
        <a
          href="https://ktbs.kar.nic.in/new/index.html#!/textbook"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs font-medium hover:border-brand/40 hover:text-brand transition"
        >
          <BookOpen className="h-3.5 w-3.5" />
          Karnataka Textbook (KTBS)
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <ChapterContentOverview chapter={chapter} />

      {chapter.map && (
        <ChapterMap chapter={chapter} color={color} />
      )}

      {chapter.importantDates.length > 0 && (
        <ChapterTimeline chapter={chapter} color={color} />
      )}

      {chapter.formulas.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Sigma className="h-4 w-4 text-brand" />
            <h3 className="font-display font-semibold">Formulas</h3>
            <Badge variant="outline" className="rounded-full text-[10px]">
              {chapter.formulas.length}
            </Badge>
          </div>
          <FormulasSection formulas={chapter.formulas} loading={false} />
        </div>
      )}

      {mcqs.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Brain className="h-4 w-4 text-brand" />
            <h3 className="font-display font-semibold">Practice MCQs</h3>
            <Badge variant="outline" className="rounded-full text-[10px]">
              {mcqs.length}
            </Badge>
          </div>
          <PracticeQuiz mcqs={mcqs} color={color} />
        </div>
      )}

      {chapter.exercises.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
          <div className="mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-brand" />
            <h3 className="font-display font-semibold">Exercises</h3>
            <Badge variant="outline" className="rounded-full text-[10px]">
              {chapter.exercises.length}
            </Badge>
          </div>
          <ol className="space-y-3 list-decimal pl-5">
            {chapter.exercises.map((ex) => (
              <li key={ex.id} className="text-sm">
                <div className="text-foreground/90">{ex.question}</div>
                {ex.answer && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    <span className="font-semibold">Answer:</span> {ex.answer}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {chapter.formulas.length === 0 &&
        mcqs.length === 0 &&
        chapter.exercises.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
            Detailed content for this chapter coming soon.
          </div>
        )}
    </div>
  );
}

/* ---------------- Content Resources (from chapter JSON) ---------------- */

function ContentResourcesGrid({ resources }: { resources: ContentResource[] }) {
  const iconFor = (type: string) => {
    const t = type.toLowerCase();
    if (t === "video") return "🎬";
    if (t === "textbook") return "📖";
    if (t === "course") return "🎓";
    return "🔗";
  };

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <h3 className="mb-3 font-display text-base font-semibold">Recommended Resources</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {resources.map((r, i) => (
          <div
            key={`${r.url}-${i}`}
            className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background p-3"
          >
            <div className="flex items-start gap-2">
              <span className="text-2xl leading-none" aria-hidden>
                {iconFor(r.type)}
              </span>
              <div className="min-w-0">
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {r.provider}
                </div>
                <div className="text-sm font-semibold leading-snug">{r.label}</div>
              </div>
            </div>
            {r.description && (
              <p className="text-xs text-muted-foreground leading-relaxed">{r.description}</p>
            )}
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto inline-flex items-center justify-center rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground hover:bg-brand/90 transition"
            >
              Open
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Resources ---------------- */


function ResourcesSection({ chapters }: { chapters: ChapterDoc[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(
    chapters[0]?.id ?? null,
  );

  if (chapters.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
        No chapters available.
      </div>
    );
  }

  const selected = chapters.find((c) => c.id === selectedId) ?? chapters[0];

  return (
    <div className="grid gap-4 md:grid-cols-[220px_1fr]">
      {/* Chapter picker */}
      <div className="rounded-2xl border border-border/60 bg-card p-2 md:max-h-[640px] md:overflow-y-auto">
        <ul className="space-y-1">
          {chapters.map((c, i) => {
            const active = selected.id === c.id;
            return (
              <li key={c.id}>
                <button
                  onClick={() => setSelectedId(c.id)}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                    active
                      ? "bg-brand/10 text-foreground"
                      : "hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                    {String(c.chapterNumber ?? i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 truncate">{c.title}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="min-w-0">
        <ChapterResources chapter={selected} />
      </div>
    </div>
  );
}

/* ---------------- Chapters ---------------- */

function ChaptersSection({
  chapters,
  color,
  subjectId,
}: {
  chapters: ChapterDoc[];
  color: string;
  subjectId: string;
}) {
  const isMath = subjectId === "math";
  const { masteryById } = useAllChapterMastery();
  const [done, setDone] = useState<Set<string>>(
    () => new Set(chapters.filter((c) => c.done).map((c) => c.id)),
  );

  // Sync local state when chapters arrive/refresh from Firestore.
  useEffect(() => {
    setDone(new Set(chapters.filter((c) => c.done).map((c) => c.id)));
  }, [chapters]);

  function toggle(id: string) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        next.add(id);
        toast.success("Chapter marked complete");
      }
      return next;
    });
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {chapters.length === 0 && (
        <div className="md:col-span-2 rounded-2xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
          No chapters for this subject yet.
        </div>
      )}
      {chapters.map((c, i) => {
        const isDone = done.has(c.id);
        const effProgress = isDone ? 100 : c.progress;
        const mathMastery = isMath ? masteryById.get(c.id) : undefined;
        const tier = mathMastery ? tierFor(mathMastery.mastery) : null;
        return (
          <div
            key={c.id}
            className={`rounded-2xl border p-4 transition ${
              isDone
                ? "border-success/30 bg-success/5"
                : "border-border/60 bg-card hover:border-brand/40"
            }`}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={() => toggle(c.id)}
                className="mt-1 shrink-0"
                aria-label="Toggle chapter complete"
              >
                {isDone ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  Chapter {i + 1}
                  <DifficultyBadge level={c.difficulty} />
                  {tier && (
                    <Badge
                      variant="outline"
                      className={`h-4 rounded-full border-transparent px-1.5 text-[9px] ${tier.bg} ${tier.tone}`}
                    >
                      {tier.label}
                    </Badge>
                  )}
                  {mathMastery && mathMastery.weakConcepts.length > 0 && (
                    <span
                      title={`Weak: ${mathMastery.weakConcepts.join(", ")}`}
                      className="inline-block h-1.5 w-1.5 rounded-full bg-destructive"
                    />
                  )}
                </div>
                <div
                  className={`font-display font-semibold ${
                    isDone ? "text-muted-foreground line-through" : ""
                  }`}
                >
                  {c.title}
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${effProgress}%`,
                        background: `linear-gradient(90deg, ${color}, var(--brand-glow))`,
                      }}
                    />
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground w-9 text-right">
                    {effProgress}%
                  </span>
                </div>
                {isMath && (
                  <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                    <span>
                      {mathMastery
                        ? `Mastery ${Math.round(mathMastery.mastery)}% · ${mathMastery.predictedMarks}m predicted`
                        : "No mastery data yet"}
                    </span>
                    <Button
                      asChild
                      size="sm"
                      variant="ghost"
                      className="h-6 rounded-full px-2 text-[11px]"
                    >
                      <Link
                        to="/subjects/math/$chapterId"
                        params={{ chapterId: c.id }}
                      >
                        Open <ArrowRight className="ml-0.5 h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DifficultyBadge({ level }: { level: ChapterDoc["difficulty"] }) {
  const tone =
    level === "Easy"
      ? "bg-success/15 text-success border-success/30"
      : level === "Medium"
        ? "bg-warning/15 text-warning border-warning/30"
        : "bg-destructive/15 text-destructive border-destructive/30";
  return (
    <Badge variant="outline" className={`h-4 px-1.5 text-[9px] rounded-full ${tone}`}>
      {level}
    </Badge>
  );
}

/* ---------------- Content overview (from /content JSON) ---------------- */

function ChapterContentOverview({ chapter }: { chapter: NormalizedChapter }) {
  return (
    <div className="mb-4 rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
        <BookOpen className="h-3.5 w-3.5" /> Chapter overview
      </div>
      <h2 className="mt-1 font-display text-xl font-bold">{chapter.title}</h2>
      {chapter.summary && (
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          {chapter.summary}
        </p>
      )}
      {chapter.learningPoints && chapter.learningPoints.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-warning" />
            <h3 className="font-display font-semibold">Learning points</h3>
            <Badge variant="outline" className="rounded-full text-[10px]">
              {chapter.learningPoints.length}
            </Badge>
          </div>
          <ul className="mt-2 space-y-1.5 pl-1">
            {chapter.learningPoints.map((p: string, i: number) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                <span className="text-foreground/90">{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ---------------- Chapter picker pane (drives content tabs) ---------------- */

function ContentChapterPane({
  chapters,
  activeId,
  onSelect,
  loading,
  emptyMessage,
  children,
}: {
  chapters: NormalizedChapter[];
  activeId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  emptyMessage: string;
  children: (chapter: NormalizedChapter) => React.ReactNode;
}) {
  if (loading && chapters.length === 0) {
    return <Skeleton className="h-48 w-full rounded-2xl" />;
  }
  if (chapters.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }
  const selected =
    chapters.find((c) => c.id === activeId) ?? chapters[0];
  return (
    <div className="grid gap-4 md:grid-cols-[220px_1fr]">
      <div className="rounded-2xl border border-border/60 bg-card p-2 md:max-h-[640px] md:overflow-y-auto">
        <ul className="space-y-1">
          {chapters.map((c, i) => {
            const active = selected.id === c.id;
            return (
              <li key={c.id}>
                <button
                  onClick={() => onSelect(c.id)}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                    active
                      ? "bg-brand/10 text-foreground"
                      : "hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                    {String(c.chapterNumber || i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 truncate">{c.title}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="min-w-0">{children(selected)}</div>
    </div>
  );
}

function FormulasSection({
  formulas,
  loading,
}: {
  formulas: ContentFormula[];
  loading: boolean;
}) {
  if (loading) {
    return <Skeleton className="h-48 w-full rounded-2xl" />;
  }
  if (formulas.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
        No formulas available for this chapter yet.
      </div>
    );
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {formulas.map((f, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <Sigma className="h-4 w-4" />
            </div>
            <h3 className="font-display font-semibold">{f.label}</h3>
          </div>
          <div className="mt-3 rounded-xl border border-border/60 bg-background/60 p-3 font-mono text-sm">
            {f.expression}
          </div>
          {f.description && (
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              {f.description}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

/* ---------------- Topics ---------------- */

function TopicsSection({
  weak,
  strong,
  color,
}: {
  weak: string[];
  strong: string[];
  color: string;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Strong */}
      <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/15 text-success">
            <ThumbsUp className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display font-semibold">Strong topics</h3>
            <p className="text-xs text-muted-foreground">Lock in these wins.</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {strong.length === 0 && (
            <p className="text-sm text-muted-foreground">No strong topics yet — keep practicing.</p>
          )}
          {strong.map((t) => (
            <div
              key={t}
              className="flex items-center justify-between rounded-xl border border-success/20 bg-success/5 p-3"
            >
              <span className="text-sm font-medium">{t}</span>
              <Badge className="bg-success/15 text-success hover:bg-success/15 border-0 rounded-full">
                Mastered
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Weak */}
      <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display font-semibold">Weak topics</h3>
            <p className="text-xs text-muted-foreground">Where AI says to focus this week.</p>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {weak.length === 0 && (
            <p className="text-sm text-muted-foreground">Great — no weak topics flagged.</p>
          )}
          {weak.map((t, i) => (
            <div
              key={t}
              className="rounded-xl border border-destructive/20 bg-destructive/5 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{t}</span>
                <Badge
                  variant="outline"
                  className="rounded-full bg-destructive/10 text-destructive border-destructive/30"
                >
                  Priority {i + 1}
                </Badge>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground flex items-start gap-1">
                <Lightbulb className="h-3 w-3 mt-0.5 text-warning shrink-0" />
                {generateTip(t)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* AI summary band */}
      <div
        className="md:col-span-2 rounded-3xl p-6 text-white shadow-glow relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${color}, color-mix(in oklab, ${color} 50%, var(--brand)))`,
        }}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold">AI study suggestion</h3>
            <p className="mt-1 text-sm text-white/90">
              Spend 60% of this week on{" "}
              <span className="font-semibold">{weak[0] ?? "your weakest area"}</span> with
              targeted MCQ drills, and use 20% to maintain{" "}
              <span className="font-semibold">{strong[0] ?? "strong topics"}</span> via timed
              revision.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function generateTip(topic: string): string {
  const lower = topic.toLowerCase();
  if (lower.includes("grammar") || lower.includes("व्याकरण") || lower.includes("ವ್ಯಾಕರಣ"))
    return "Daily 15-min rules drill + 10 example sentences.";
  if (lower.includes("equation") || lower.includes("quadratic"))
    return "Solve 5 mixed problems per day; revisit the discriminant method.";
  if (lower.includes("electricity") || lower.includes("circuit"))
    return "Re-derive Ohm's law and solve 3 numericals.";
  if (lower.includes("carbon")) return "Memorise functional groups; practise naming compounds.";
  if (lower.includes("money") || lower.includes("credit"))
    return "Map formal vs informal credit with one real example each.";
  if (lower.includes("forest")) return "Make a 1-page timeline of forest acts and effects.";
  return "Allocate 2 focused sessions this week and end with 5 MCQs.";
}

/* ---------------- Practice MCQs ---------------- */

function PracticeQuiz({ mcqs, color }: { mcqs: MCQ[]; color: string }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [completed, setCompleted] = useState(false);

  const q = mcqs[index];
  const correctCount = useMemo(
    () => Object.values(answers).filter(Boolean).length,
    [answers],
  );
  const progress = Math.round(((index + (revealed ? 1 : 0)) / mcqs.length) * 100);

  function submit() {
    if (selected === null) return;
    const correct = selected === q.correctIndex;
    setAnswers((a) => ({ ...a, [q.id]: correct }));
    setRevealed(true);
    if (correct) {
      toast.success("Correct!", { icon: <CheckCircle2 className="h-4 w-4" /> });
    } else {
      toast.error("Not quite — read the explanation.", {
        icon: <XCircle className="h-4 w-4" />,
      });
    }
  }

  function next() {
    if (index + 1 >= mcqs.length) {
      setCompleted(true);
      return;
    }
    setIndex(index + 1);
    setSelected(null);
    setRevealed(false);
  }

  function reset() {
    setIndex(0);
    setSelected(null);
    setRevealed(false);
    setAnswers({});
    setCompleted(false);
  }

  if (completed) {
    const score = Math.round((correctCount / mcqs.length) * 100);
    const tone =
      score >= 80 ? "text-success" : score >= 50 ? "text-warning" : "text-destructive";
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-5 text-center shadow-soft">
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-white"
          style={{ background: color }}
        >
          <Trophy className="h-8 w-8" />
        </div>
        <h3 className="mt-4 font-display text-2xl font-bold">Quiz complete!</h3>
        <p className="text-sm text-muted-foreground">You answered all {mcqs.length} questions.</p>
        <div className={`mt-4 font-display text-5xl font-bold ${tone}`}>{score}%</div>
        <p className="text-sm text-muted-foreground">
          {correctCount}/{mcqs.length} correct
        </p>
        <Button onClick={reset} className="mt-6 rounded-full">
          <RotateCcw className="mr-1.5 h-4 w-4" /> Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="rounded-full">
            Q{index + 1} / {mcqs.length}
          </Badge>
          <DifficultyBadge level={q.difficulty} />
          <Badge variant="secondary" className="rounded-full text-[10px]">
            {q.topic}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Flame className="h-3.5 w-3.5 text-warning" />
          {correctCount} correct
        </div>
      </div>
      <Progress value={progress} className="mt-3" />

      {/* Question */}
      <h3 className="mt-5 font-display text-lg font-semibold leading-snug">{q.question}</h3>

      {/* Options */}
      <div className="mt-4 space-y-2">
        {q.options.map((opt, i) => {
          const isSelected = selected === i;
          const isCorrect = revealed && i === q.correctIndex;
          const isWrong = revealed && isSelected && i !== q.correctIndex;
          return (
            <button
              key={i}
              type="button"
              disabled={revealed}
              onClick={() => setSelected(i)}
              className={`group flex w-full min-h-[3rem] h-auto items-start gap-3 rounded-2xl border p-3 text-left text-sm transition ${
                isCorrect
                  ? "border-success/40 bg-success/10"
                  : isWrong
                    ? "border-destructive/40 bg-destructive/10"
                    : isSelected
                      ? "border-brand/50 bg-brand/5"
                      : "border-border/60 bg-background/40 hover:border-brand/40"
              }`}
            >
              <span
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
                  isCorrect
                    ? "bg-success text-white"
                    : isWrong
                      ? "bg-destructive text-white"
                      : "bg-muted text-foreground"
                }`}
              >
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1 min-w-0 whitespace-normal break-words leading-relaxed">
                {opt}
              </span>
              {isCorrect && <CheckCircle2 className="h-4 w-4 shrink-0 mt-1 text-success" />}
              {isWrong && <XCircle className="h-4 w-4 shrink-0 mt-1 text-destructive" />}
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {revealed && (
        <div className="mt-4 rounded-2xl border border-brand/20 bg-brand/5 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-brand uppercase tracking-widest">
            <Sparkles className="h-3.5 w-3.5" /> AI Explanation
          </div>
          <p className="mt-1 text-sm">{q.explanation}</p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-5 flex justify-end gap-2">
        {!revealed ? (
          <Button onClick={submit} disabled={selected === null} className="rounded-full">
            Check Answer
          </Button>
        ) : (
          <Button onClick={next} className="rounded-full">
            {index + 1 >= mcqs.length ? "Finish" : "Next"}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
