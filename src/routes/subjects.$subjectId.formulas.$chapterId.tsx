import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, AlertTriangle, Sigma } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { loadChapter } from "@/lib/contentLoader";
import {
  normalizeChapterData,
  type NormalizedChapter,
} from "@/lib/normalizeChapterData";
import { contentFolderFor } from "@/lib/subject-content-folder";
import { FormulasSection } from "@/components/subject/formulas-section";

export const Route = createFileRoute(
  "/subjects/$subjectId/formulas/$chapterId",
)({
  head: ({ params }) => ({
    meta: [
      { title: `Formulas — ${params.chapterId} — VidyaPath` },
      {
        name: "description",
        content: "Key formulas for this chapter, ready for quick revision.",
      },
    ],
  }),
  component: ChapterFormulasPage,
});

function ChapterFormulasPage() {
  const { subjectId, chapterId } = Route.useParams();
  const folder = contentFolderFor(subjectId);
  const [retryToken, setRetryToken] = useState(0);

  const chapterQuery = useQuery({
    queryKey: ["content", "chapter", folder ?? "none", chapterId, retryToken],
    queryFn: async () => {
      if (!folder) throw new Error("Unsupported subject");
      const raw = await loadChapter(folder, chapterId);
      return normalizeChapterData(raw) as NormalizedChapter;
    },
    enabled: !!folder,
    staleTime: 60 * 60 * 1000,
  });

  const backLink = (
    <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 rounded-full">
      <Link to="/subjects/$subjectId" params={{ subjectId }}>
        <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to subject
      </Link>
    </Button>
  );

  return (
    <DashboardLayout title="Formulas">
      <div className="mx-auto max-w-3xl space-y-4">
        {backLink}

        {chapterQuery.isLoading ? (
          <>
            <Skeleton className="h-10 w-2/3 rounded-full" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </>
        ) : chapterQuery.isError || !chapterQuery.data ? (
          <div className="rounded-2xl border border-border/60 bg-card p-8 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
            <h1 className="mt-2 font-display text-xl font-bold">
              Unable to load chapter. Retry.
            </h1>
            <div className="mt-4 flex justify-center gap-2">
              <Button
                className="rounded-full"
                onClick={() => setRetryToken((n) => n + 1)}
              >
                Retry
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/subjects/$subjectId" params={{ subjectId }}>
                  Back to subject
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                <Sigma className="h-3.5 w-3.5" /> Formulas
              </div>
              <h1 className="mt-1 font-display text-2xl font-bold">
                {chapterQuery.data.title}
              </h1>
              {chapterQuery.data.summary && (
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {chapterQuery.data.summary}
                </p>
              )}
            </div>
            <FormulasSection
              formulas={chapterQuery.data.formulas ?? []}
              loading={false}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}