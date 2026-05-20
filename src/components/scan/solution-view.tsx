import { useState } from "react";
import { Lightbulb, Sparkles, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SolvedQuestionDoc, SolveMode } from "@/integrations/firebase/types";

export function SolutionView({
  mode,
  doc,
  pending,
}: {
  mode: SolveMode;
  doc?: SolvedQuestionDoc;
  pending?: boolean;
}) {
  if (pending && !doc) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border/60 bg-card/60 py-10 text-center animate-fade-in">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
        <p className="text-sm text-muted-foreground">Aura is thinking it through…</p>
      </div>
    );
  }
  if (!doc) {
    return (
      <div className="rounded-3xl border border-dashed border-border/60 bg-card/60 p-6 text-center text-sm text-muted-foreground animate-fade-in">
        Pick a mode to see how Aura would explain it.
      </div>
    );
  }

  if (mode === "hint" && doc.hints?.length) {
    return <HintProgression hints={doc.hints} />;
  }
  if (mode === "step_by_step" && doc.steps?.length) {
    const final = doc.content.match(/final\s*answer\s*[:\-]\s*(.+)$/im)?.[1]?.trim();
    return (
      <article className="space-y-3 rounded-3xl border border-border/60 bg-card p-4 shadow-soft animate-fade-in">
        <ol className="space-y-3">
          {doc.steps.map((s) => (
            <li key={s.order} className="flex gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full gradient-brand text-[12px] font-bold text-brand-foreground">
                {s.order}
              </span>
              <p className="text-sm leading-relaxed text-foreground">{s.text}</p>
            </li>
          ))}
        </ol>
        {final && (
          <div className="mt-2 rounded-2xl border border-brand/30 bg-brand/5 p-3">
            <div className="text-[11px] font-medium uppercase tracking-wide text-brand">Final answer</div>
            <div className="mt-0.5 font-display text-base font-semibold text-foreground">{final}</div>
          </div>
        )}
      </article>
    );
  }

  return (
    <article className="rounded-3xl border border-border/60 bg-card p-4 shadow-soft animate-fade-in">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-brand">
        <Sparkles className="h-3.5 w-3.5" />
        {modeLabel(mode)}
      </div>
      <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-foreground">
        {doc.content}
      </p>
    </article>
  );
}

function modeLabel(m: SolveMode) {
  return { quick: "Quick answer", step_by_step: "Step by step", hint: "Hint", board: "Board method", kannada: "Bilingual" }[m];
}

function HintProgression({ hints }: { hints: { level: "nudge" | "guided" | "full"; text: string }[] }) {
  const [revealed, setRevealed] = useState(1);
  const labels = { nudge: "Gentle nudge", guided: "Next step", full: "Full solution" } as const;
  return (
    <div className="space-y-2.5 animate-fade-in">
      {hints.slice(0, revealed).map((h, i) => (
        <div
          key={i}
          className="rounded-3xl border border-border/60 bg-card p-4 shadow-soft animate-slide-in-right"
        >
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-brand">
            <Lightbulb className="h-3.5 w-3.5" />
            Hint {i + 1} · {labels[h.level]}
          </div>
          <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-foreground">{h.text}</p>
        </div>
      ))}
      {revealed < hints.length && (
        <Button
          onClick={() => setRevealed((v) => v + 1)}
          className="press w-full rounded-2xl gradient-brand text-brand-foreground shadow-soft"
        >
          Reveal next hint <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      )}
      {revealed >= hints.length && (
        <p className="text-center text-[11px] text-muted-foreground">You've seen all hints. Try the question again from scratch.</p>
      )}
    </div>
  );
}