import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, AlertTriangle, Sigma } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FormulasSection } from "@/components/subject/formulas-section";
import { useChapterContent } from "@/hooks/use-chapter-content";
import {
  canonicalSubjectRouteId,
  findFormulaIndexBySlug,
} from "@/lib/chapter-routes";

export const Route = createFileRoute(
  "/subjects/$subjectId/formulas/$chapterId/$formulaSlug",
)({
  head: ({ params }) => ({
    meta: [
      { title: `Aura — Formula — ${params.formulaSlug}` },
      {
        name: "description",
        content: "Formula detail for quick revision.",
      },
    ],
  }),
  component: FormulaDetailPage,
});

function FormulaDetailPage() {
  const {
    subjectId: rawSubjectId,
    chapterId: rawChapterId,
    formulaSlug,
  } = Route.useParams();
  const subjectId = canonicalSubjectRouteId(rawSubjectId);
  const [retryToken, setRetryToken] = useState(0);
  const chapterQuery = useChapterContent(rawSubjectId, rawChapterId, retryToken);

  const formulaIndex =
    chapterQuery.data && formulaSlug
      ? findFormulaIndexBySlug(chapterQuery.data.formulas, formulaSlug)
      : -1;
  const formula =
    formulaIndex >= 0 && chapterQuery.data
      ? chapterQuery.data.formulas[formulaIndex]
      : null;

  return (
    <DashboardLayout title="Formula">
      <div className="mx-auto max-w-3xl space-y-4">
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 rounded-full">
          <Link
            to="/subjects/$subjectId/formulas/$chapterId"
            params={{ subjectId, chapterId: rawChapterId }}
          >
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to chapter formulas
          </Link>
        </Button>

        {chapterQuery.isLoading ? (
          <>
            <Skeleton className="h-10 w-2/3 rounded-full" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </>
        ) : chapterQuery.isError || !chapterQuery.data || !formula ? (
          <div className="rounded-2xl border border-border/60 bg-card p-8 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
            <h1 className="mt-2 font-display text-xl font-bold">
              Formula not found
            </h1>
            <div className="mt-4 flex justify-center gap-2">
              <Button
                className="rounded-full"
                onClick={() => setRetryToken((n) => n + 1)}
              >
                Retry
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <Link
                  to="/subjects/$subjectId/formulas/$chapterId"
                  params={{ subjectId, chapterId: rawChapterId }}
                >
                  Back to chapter formulas
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                <Sigma className="h-3.5 w-3.5" /> Formula detail
              </div>
              <h1 className="mt-1 font-display text-2xl font-bold">
                {chapterQuery.data.title}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{formula.label}</p>
            </div>
            <FormulasSection formulas={[formula]} loading={false} />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
