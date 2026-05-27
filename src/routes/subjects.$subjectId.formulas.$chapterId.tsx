import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowRight, AlertTriangle, Sigma } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useChapterContent } from "@/hooks/use-chapter-content";
import {
  canonicalSubjectRouteId,
  contentItemSlug,
  isFormulaDetailRoute,
} from "@/lib/chapter-routes";

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
  component: FormulaChapterShell,
});

function FormulaChapterShell() {
  const isDetail = useRouterState({
    select: (s) => isFormulaDetailRoute(s.location.pathname),
  });

  if (isDetail) {
    return <Outlet />;
  }

  return <FormulaChapterListPage />;
}

function FormulaChapterListPage() {
  const { subjectId: rawSubjectId, chapterId: rawChapterId } = Route.useParams();
  const subjectId = canonicalSubjectRouteId(rawSubjectId);
  const [retryToken, setRetryToken] = useState(0);
  const chapterQuery = useChapterContent(rawSubjectId, rawChapterId, retryToken);

  return (
    <DashboardLayout title="Formulas">
      <div className="mx-auto max-w-3xl space-y-4">
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 rounded-full">
          <Link to="/subjects/$subjectId" params={{ subjectId }}>
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to subject
          </Link>
        </Button>

        {chapterQuery.isLoading ? (
          <>
            <Skeleton className="h-10 w-2/3 rounded-full" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </>
        ) : chapterQuery.isError || !chapterQuery.data ? (
          <ChapterErrorState
            onRetry={() => setRetryToken((n) => n + 1)}
            subjectId={subjectId}
          />
        ) : (
          <>
            <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                <Sigma className="h-3.5 w-3.5" /> Formulas
              </div>
              <h1 className="mt-1 font-display text-2xl font-bold">
                {chapterQuery.data.title}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {chapterQuery.data.formulas.length} formula
                {chapterQuery.data.formulas.length === 1 ? "" : "s"} in this
                chapter
              </p>
            </div>

            {chapterQuery.data.formulas.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
                No formulas available for this chapter yet.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {chapterQuery.data.formulas.map((formula, index) => {
                  const formulaSlug = contentItemSlug(formula.label, index);
                  return (
                    <Link
                      key={formulaSlug}
                      to="/subjects/$subjectId/formulas/$chapterId/$formulaSlug"
                      params={{
                        subjectId,
                        chapterId: rawChapterId,
                        formulaSlug,
                      }}
                      className="group rounded-2xl border border-border/60 bg-card p-4 transition hover:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/40"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                          <Sigma className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-display font-semibold">
                            {formula.label}
                          </div>
                          <p className="mt-1 line-clamp-2 font-mono text-xs text-muted-foreground">
                            {formula.expression}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function ChapterErrorState({
  onRetry,
  subjectId,
}: {
  onRetry: () => void;
  subjectId: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-8 text-center">
      <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
      <h1 className="mt-2 font-display text-xl font-bold">
        Unable to load chapter. Retry.
      </h1>
      <div className="mt-4 flex justify-center gap-2">
        <Button className="rounded-full" onClick={onRetry}>
          Retry
        </Button>
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/subjects/$subjectId" params={{ subjectId }}>
            Back to subject
          </Link>
        </Button>
      </div>
    </div>
  );
}
