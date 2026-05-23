import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ArrowRight, BookOpen, FileText, ListChecks, Sparkles, AlertTriangle, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchSubjects } from "@/integrations/firebase/subjects";
import { loadManifest } from "@/lib/contentLoader";

function contentFolderFor(subjectId: string): string | null {
  if (subjectId === "math" || subjectId === "mathematics") return "mathematics";
  if (subjectId === "science") return "science";
  if (subjectId === "social" || subjectId === "social-science" || subjectId === "socialscience") return "social-science";
  return null;
}

export const Route = createFileRoute("/subjects/")({
  head: () => ({
    meta: [
      { title: "Subjects — VidyaPath" },
      { name: "description", content: "Browse SSLC subjects: Mathematics, Science, Social, English, Kannada, Hindi." },
    ],
  }),
  component: SubjectsPage,
});

function SubjectsPage() {
  const { data: subjects, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["subjects"],
    queryFn: fetchSubjects,
  });

  // Load per-subject manifests in parallel so chapter totals reflect real
  // manifest data instead of stale seeded counts.
  const manifestQueries = useQueries({
    queries: (subjects ?? []).map((s) => {
      const folder = contentFolderFor(s.id);
      return {
        queryKey: ["content", "manifest", folder ?? "none"],
        queryFn: () => loadManifest(folder ?? undefined) as Promise<{ totalChapters?: number; chapters?: unknown[] }>,
        enabled: !!folder,
        staleTime: 60 * 60 * 1000,
      };
    }),
  });

  const manifestMeta = useMemo(() => {
    const map = new Map<string, number>();
    if (!subjects) return map;
    for (let i = 0; i < subjects.length; i++) {
      const data = manifestQueries[i]?.data;
      if (!data) continue;
      const total =
        (data as { totalChapters?: number }).totalChapters ??
        (data as { chapters?: unknown[] }).chapters?.length ??
        0;
      if (total > 0) map.set(subjects[i].id, total);
    }
    return map;
  }, [subjects, manifestQueries]);

  return (
    <DashboardLayout title="Subjects">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6">
          <h1 className="font-display text-3xl font-bold tracking-tight">All Subjects</h1>
          <p className="text-sm text-muted-foreground">
            Karnataka SSLC Class 10 syllabus · {subjects?.length ?? 0} subjects
          </p>
        </header>

        {isLoading && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[340px] rounded-3xl" />
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-8">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-destructive shrink-0" />
              <div className="flex-1">
                <h3 className="font-display text-lg font-semibold text-destructive">
                  Couldn't load subjects
                </h3>
                <p className="mt-1 text-sm text-muted-foreground break-words">
                  Unable to load data. Please try again later.
                </p>
                <div className="mt-4 flex gap-2">
                  <Button onClick={() => refetch()} size="sm" className="rounded-full">
                    Try again
                  </Button>
                  <Button asChild size="sm" variant="outline" className="rounded-full">
                    <Link to="/seed">
                      <Database className="mr-1.5 h-3.5 w-3.5" /> Seed Firestore
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !isError && subjects && subjects.length === 0 && (
          <div className="rounded-3xl border border-dashed border-border/60 p-10 text-center">
            <Database className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-3 font-display text-lg font-semibold">No subjects yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Run the seeder once to populate Firestore with the SSLC syllabus.
            </p>
            <Button asChild className="mt-4 rounded-full">
              <Link to="/seed">Open seeder</Link>
            </Button>
          </div>
        )}

        {!isLoading && !isError && subjects && subjects.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s) => (
            <article
              key={s.id}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-4 shadow-soft transition-all hover:-translate-y-1 hover:shadow-glow"
            >
              <div
                className="absolute -right-12 -top-12 h-40 w-40 rounded-full blur-2xl opacity-40 transition-opacity group-hover:opacity-70"
                style={{ background: s.color }}
              />
              <div className="relative">
                <div className="flex items-start justify-between">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-bold"
                    style={{ background: `color-mix(in oklab, ${s.color} 18%, transparent)`, color: s.color }}
                  >
                    {s.emoji}
                  </div>
                  <span
                    className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={{ background: `color-mix(in oklab, ${s.color} 15%, transparent)`, color: s.color }}
                  >
                    {s.completion}% done
                  </span>
                </div>
                <h3 className="mt-4 font-display text-xl font-bold">{s.name}</h3>
                {s.nameKn && <p className="text-sm text-muted-foreground">{s.nameKn}</p>}

                <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${s.completion}%`, background: `linear-gradient(90deg, ${s.color}, var(--brand-glow))` }}
                  />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <Stat label="Chapters" value={`${s.chaptersDone}/${s.chaptersTotal}`} />
                  <Stat label="Mastery" value={`${s.mastery}%`} />
                  <Stat label="Target" value={`${s.target}%`} />
                </div>

                <div className="mt-4 space-y-2">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Weak topics</div>
                    <div className="flex flex-wrap gap-1.5">
                      {s.weakTopics.map((t) => (
                        <span key={t} className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] text-destructive">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex gap-2">
                  <Button asChild size="sm" className="flex-1 gap-1 rounded-full">
                    <Link to="/subjects/$subjectId" params={{ subjectId: s.id }}>
                      Open <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button asChild size="icon" variant="outline" className="rounded-full" aria-label="Chapters">
                    <Link to="/subjects/$subjectId" params={{ subjectId: s.id }} hash="chapters">
                      <BookOpen className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="icon" variant="outline" className="rounded-full" aria-label="Topics">
                    <Link to="/subjects/$subjectId" params={{ subjectId: s.id }}>
                      <ListChecks className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="icon" variant="outline" className="rounded-full" aria-label="MCQs">
                    <Link to="/subjects/$subjectId" params={{ subjectId: s.id }}>
                      <FileText className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
        )}

        <div className="mt-8 rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-brand text-brand-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">AI recommends focusing on Social Science this week</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your predicted score is 11 points below target. Schedule 3 sessions on Money & Credit and Forest Society to recover.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/60 py-2">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display text-sm font-bold">{value}</div>
    </div>
  );
}