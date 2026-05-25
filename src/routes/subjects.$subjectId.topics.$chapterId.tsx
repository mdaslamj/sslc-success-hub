import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, AlertTriangle, Sparkles } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { loadChapter } from "@/lib/contentLoader";
import {
  normalizeChapterData,
  type NormalizedChapter,
} from "@/lib/normalizeChapterData";
import { contentFolderFor } from "@/lib/subject-content-folder";
import { ChapterContentOverview } from "@/components/subject/chapter-content-overview";

export const Route = createFileRoute(
  "/subjects/$subjectId/topics/$chapterId",
)({
  head: ({ params }) => ({
    meta: [
      { title: `Topics — ${params.chapterId} — VidyaPath` },
      {
        name: "description",
        content: "Topics, key terms and exercises for this chapter.",
      },
    ],
  }),
  component: ChapterTopicsPage,
});

function ChapterTopicsPage() {
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

  return (
    <DashboardLayout title="Topics">
      <div className="mx-auto max-w-3xl space-y-4">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="mb-2 -ml-2 rounded-full"
        >
          <Link to="/subjects/$subjectId" params={{ subjectId }}>
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to subject
          </Link>
        </Button>

        {chapterQuery.isLoading ? (
          <>
            <Skeleton className="h-10 w-2/3 rounded-full" />
            <Skeleton className="h-64 w-full rounded-2xl" />
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
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" /> Topics
            </div>
            <ChapterContentOverview chapter={chapterQuery.data} />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}