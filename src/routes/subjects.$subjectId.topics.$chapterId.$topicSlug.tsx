import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, AlertTriangle, Sparkles } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useChapterContent } from "@/hooks/use-chapter-content";
import {
  buildTopicListItems,
  canonicalSubjectRouteId,
  findTopicListItem,
} from "@/lib/chapter-routes";

export const Route = createFileRoute(
  "/subjects/$subjectId/topics/$chapterId/$topicSlug",
)({
  head: ({ params }) => ({
    meta: [
      { title: `Aura — Topic — ${params.topicSlug}` },
      {
        name: "description",
        content: "Topic detail for this chapter.",
      },
    ],
  }),
  component: TopicDetailPage,
});

function TopicDetailPage() {
  const {
    subjectId: rawSubjectId,
    chapterId: rawChapterId,
    topicSlug,
  } = Route.useParams();
  const subjectId = canonicalSubjectRouteId(rawSubjectId);
  const [retryToken, setRetryToken] = useState(0);
  const chapterQuery = useChapterContent(rawSubjectId, rawChapterId, retryToken);
  const topicItems = chapterQuery.data
    ? buildTopicListItems(chapterQuery.data)
    : [];
  const topic = findTopicListItem(topicItems, topicSlug);

  return (
    <DashboardLayout title="Topic">
      <div className="mx-auto max-w-3xl space-y-4">
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 rounded-full">
          <Link
            to="/subjects/$subjectId/topics/$chapterId"
            params={{ subjectId, chapterId: rawChapterId }}
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to chapter topics
          </Link>
        </Button>

        {chapterQuery.isLoading ? (
          <>
            <Skeleton className="h-10 w-2/3 rounded-full" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </>
        ) : chapterQuery.isError || !chapterQuery.data || !topic ? (
          <div className="rounded-2xl border border-border/60 bg-card p-8 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
            <h1 className="mt-2 font-display text-xl font-bold">Topic not found</h1>
            <div className="mt-4 flex justify-center gap-2">
              <Button
                className="rounded-full"
                onClick={() => setRetryToken((n) => n + 1)}
              >
                Retry
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <Link
                  to="/subjects/$subjectId/topics/$chapterId"
                  params={{ subjectId, chapterId: rawChapterId }}
                >
                  Back to chapter topics
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              {topic.kind === "learning-point" ? "Learning point" : "Key term"}
            </div>
            <h1 className="mt-1 font-display text-2xl font-bold">{topic.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {chapterQuery.data.title}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-foreground/90">
              {topic.body}
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
