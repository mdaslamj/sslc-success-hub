import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  ExternalLink,
  Loader2,
  Library as LibraryIcon,
  CalendarPlus,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  fetchSubjects,
  fetchChapters,
} from "@/integrations/firebase/services";
import { useLibraryResources } from "@/hooks/use-resources";
import { incrementLibraryResourceViews } from "@/integrations/firebase/services/library-resources";
import type {
  LibraryLanguage,
  LibraryResourceDoc,
  SubjectDoc,
  ChapterDoc,
} from "@/integrations/firebase/types";
import { addToTodayPlan, hasTaskWithTitle } from "@/lib/today-plan-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/textbooks")({
  head: () => ({
    meta: [
      { title: "Textbooks — KTBS Chapter Library" },
      {
        name: "description",
        content:
          "Browse Karnataka SSLC KTBS textbook chapters by subject and open the official PDFs in one tap.",
      },
    ],
  }),
  component: TextbooksPage,
});

function TextbooksPage() {
  const navigate = useNavigate();
  const [language, setLanguage] = useState<LibraryLanguage>("en");
  const [subjectId, setSubjectId] = useState<string | undefined>(undefined);
  const [justAdded, setJustAdded] = useState<Record<string, boolean>>({});

  const subjectsQuery = useQuery({
    queryKey: ["subjects"],
    queryFn: fetchSubjects,
    staleTime: 10 * 60_000,
  });

  // Auto-pick first subject once loaded.
  const activeSubjectId =
    subjectId ?? subjectsQuery.data?.[0]?.id ?? undefined;

  const chaptersQuery = useQuery({
    queryKey: ["chapters", activeSubjectId],
    queryFn: () =>
      activeSubjectId ? fetchChapters(activeSubjectId) : Promise.resolve([]),
    enabled: Boolean(activeSubjectId),
    staleTime: 10 * 60_000,
  });

  const resourcesQuery = useLibraryResources({
    category: "textbook",
    subjectId: activeSubjectId,
    language,
  });

  const byChapter = useMemo(() => {
    const map = new Map<string, LibraryResourceDoc>();
    for (const r of resourcesQuery.data ?? []) {
      if (r.chapterId) map.set(r.chapterId, r);
    }
    return map;
  }, [resourcesQuery.data]);

  const activeSubject: SubjectDoc | undefined = subjectsQuery.data?.find(
    (s) => s.id === activeSubjectId,
  );

  function handleAddToPlan(ch: ChapterDoc, resource?: LibraryResourceDoc) {
    const subjectName = activeSubject?.name ?? ch.subjectId;
    const title = `Study — ${
      ch.chapterNumber ? `Ch ${ch.chapterNumber}. ` : ""
    }${ch.title}`;
    const added = addToTodayPlan({
      subject: subjectName,
      task: title,
      durationMin: ch.estimatedStudyTime && ch.estimatedStudyTime > 0
        ? Math.min(60, ch.estimatedStudyTime)
        : 35,
      link: resource?.url,
    });
    if (!added) {
      toast("Already on today's plan", { description: title });
      return;
    }
    setJustAdded((s) => ({ ...s, [ch.id]: true }));
    setTimeout(
      () => setJustAdded((s) => ({ ...s, [ch.id]: false })),
      1600,
    );
    toast.success("Added to today's plan", {
      description: subjectName,
      action: {
        label: "View planner",
        onClick: () => navigate({ to: "/planner" }),
      },
    });
  }

  return (
    <DashboardLayout title="Textbooks">
      <div className="mx-auto max-w-4xl space-y-6 pb-12">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-brand text-brand-foreground shadow-glow">
              <LibraryIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">
                KTBS Textbooks
              </h1>
              <p className="text-sm text-muted-foreground">
                Official Karnataka SSLC chapter PDFs · open in one tap
              </p>
            </div>
          </div>

          <div className="inline-flex rounded-full border border-border/60 bg-card p-1">
            {(["en", "kn"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLanguage(l)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
                  language === l
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {l === "en" ? "English" : "ಕನ್ನಡ"}
              </button>
            ))}
          </div>
        </header>

        {/* Subject pills */}
        <div className="flex flex-wrap gap-2">
          {subjectsQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading subjects…
            </div>
          ) : (
            subjectsQuery.data?.map((s) => (
              <button
                key={s.id}
                onClick={() => setSubjectId(s.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  activeSubjectId === s.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/60 bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                <span>{s.emoji}</span>
                <span>{s.name}</span>
              </button>
            ))
          )}
        </div>

        {/* Chapter list */}
        <section className="rounded-3xl border border-border/60 bg-card p-2 shadow-card sm:p-4">
          {chaptersQuery.isLoading || resourcesQuery.isLoading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading chapters…
            </div>
          ) : (chaptersQuery.data ?? []).length === 0 ? (
            <EmptyState
              title="No chapters yet"
              body="Import the syllabus from the admin page first."
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {chaptersQuery.data!.map((ch) => {
                const resource = byChapter.get(ch.id);
                const isAdded = justAdded[ch.id];
                const alreadyOnPlan = hasTaskWithTitle(
                  `Study — ${
                    ch.chapterNumber ? `Ch ${ch.chapterNumber}. ` : ""
                  }${ch.title}`,
                );
                return (
                  <li
                    key={ch.id}
                    className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4"
                  >
                    <div className="min-w-0 flex items-start gap-3 flex-1">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/40 text-muted-foreground">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {ch.chapterNumber ? `Ch ${ch.chapterNumber}. ` : ""}
                          {ch.title}
                        </div>
                        {ch.titleKn && language === "kn" && (
                          <div className="truncate text-xs text-muted-foreground">
                            {ch.titleKn}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        size="sm"
                        variant={isAdded || alreadyOnPlan ? "secondary" : "outline"}
                        className="rounded-full gap-1.5"
                        onClick={() => handleAddToPlan(ch, resource)}
                        disabled={isAdded}
                      >
                        {isAdded || alreadyOnPlan ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">On plan</span>
                          </>
                        ) : (
                          <>
                            <CalendarPlus className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Add to today</span>
                          </>
                        )}
                      </Button>
                      {resource?.url ? (
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() =>
                            void incrementLibraryResourceViews(resource.id)
                          }
                        >
                          <Button
                            size="sm"
                            className="rounded-full gap-1.5"
                            variant="default"
                          >
                            Open <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                      ) : (
                        <Badge
                          variant="outline"
                          className="rounded-full text-[11px] text-muted-foreground"
                        >
                          Not linked
                        </Badge>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <p className="text-center text-xs text-muted-foreground">
          Missing a chapter link?{" "}
          <Link to="/admin/import" className="underline">
            Seed KTBS textbooks
          </Link>{" "}
          from the admin import page.
        </p>
      </div>
    </DashboardLayout>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}