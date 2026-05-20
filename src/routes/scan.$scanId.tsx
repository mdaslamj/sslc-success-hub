import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Sparkles, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExtractedQuestion } from "@/components/scan/extracted-question";
import { SolveTabs } from "@/components/scan/solve-tabs";
import { SolutionView } from "@/components/scan/solution-view";
import { PostSolveActions } from "@/components/scan/post-solve-actions";
import { EvaluationWorkspace } from "@/components/scan/evaluation-workspace";
import { AnalyzingOverlay } from "@/components/scan/analyzing-overlay";
import { AuraRemembers } from "@/components/learning-memory/aura-remembers";
import { useScan, useSolveScan } from "@/hooks/use-scan";
import { useLearningMemory } from "@/hooks/use-learning-memory";
import type { SolveMode } from "@/integrations/firebase/types";

export const Route = createFileRoute("/scan/$scanId")({
  head: () => ({
    meta: [
      { title: "Solve workspace — Aura" },
      { name: "description", content: "Aura tutors you through a scanned question." },
    ],
  }),
  component: ScanWorkspacePage,
});

function ScanWorkspacePage() {
  const { scanId } = useParams({ from: "/scan/$scanId" });
  const { scan, loading, setScan } = useScan(scanId);
  const [mode, setMode] = useState<SolveMode>("step_by_step");
  const [lang, setLang] = useState<"en" | "kn">("en");
  const { solve, solutions, pending } = useSolveScan(scan);
  const memory = useLearningMemory();
  const startedAtRef = useRef<number>(Date.now());
  const recordedRef = useRef<string | null>(null);

  const key = `${mode}__${lang}`;
  const doc = solutions[key];
  const isPending = !!pending[key];

  // Auto-solve when the mode changes (cached so it's cheap).
  useEffect(() => {
    if (scan && !doc && !isPending) void solve(mode, lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scan?.id, mode, lang]);

  // Fold this scan into the long-term learning memory once a solution lands.
  useEffect(() => {
    if (!scan || !doc || doc.model === "error" || doc.model === "guest") return;
    const stamp = `${scan.id}__${doc.mode}__${doc.language}`;
    if (recordedRef.current === stamp) return;
    recordedRef.current = stamp;
    void memory.recordScanInteraction({
      scan,
      solved: doc,
      startedAt: startedAtRef.current,
      confidenceSignal: 0.2, // soft positive; refined by post-solve actions
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scan?.id, doc?.id]);

  const continuity = scan
    ? memory.continuityHints({
        chapterId: scan.understanding?.chapterId,
        conceptLabels: scan.understanding?.concepts,
      })
    : [];

  if (loading || !scan) {
    return <AnalyzingOverlay />;
  }

  return (
    <div
      className="min-h-[100dvh] bg-background"
      style={{ paddingTop: "max(env(safe-area-inset-top), 0)", paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
    >
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border/40 bg-background/90 px-3 backdrop-blur-xl">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9 rounded-full press">
          <Link to="/scan" aria-label="Back"><ChevronLeft className="h-5 w-5" /></Link>
        </Button>
        <div className="leading-tight">
          <div className="text-[11px] text-muted-foreground">Aura tutor</div>
          <h1 className="font-display text-[15px] font-semibold text-foreground">
            {scan.mode === "evaluate" ? "Evaluate answer" : "Solve workspace"}
          </h1>
        </div>
        <button
          onClick={() => setLang(lang === "en" ? "kn" : "en")}
          className="press ml-auto rounded-full border border-border/60 px-3 py-1.5 text-[11px] font-medium text-foreground/80"
        >
          {lang === "en" ? "EN" : "EN + ಕನ್ನಡ"}
        </button>
      </header>

      <main className="mx-auto max-w-md space-y-3.5 p-4">
        <ExtractedQuestion
          scan={scan}
          onEdit={(text) => setScan({ ...scan, extractedText: text })}
        />

        <AuraRemembers hints={continuity} />

        {scan.mode === "evaluate" ? (
          <EvaluationWorkspace scan={scan} />
        ) : (
          <>
            <div className="flex items-center gap-2 px-1">
              <Sparkles className="h-3.5 w-3.5 text-brand" />
              <span className="text-[12px] font-medium text-muted-foreground">
                Pick how you want Aura to explain
              </span>
            </div>
            <SolveTabs active={mode} onChange={setMode} />
            <SolutionView mode={mode} doc={doc} pending={isPending} />
          </>
        )}

        <PostSolveActions scan={scan} />

        <Link
          to="/scan"
          className="press mt-2 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border/60 bg-card/60 py-3 text-[13px] font-medium text-foreground/70"
        >
          <ScanLine className="h-4 w-4" /> Scan another question
        </Link>
      </main>
    </div>
  );
}