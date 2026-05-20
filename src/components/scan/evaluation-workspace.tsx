import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Award, ListChecks, AlertOctagon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { auth } from "@/integrations/firebase/config";
import { runSemanticReasoning } from "@/lib/semantic-reasoning";
import { usePostSolveActions } from "@/hooks/use-scan";
import type { ScanDoc, AiEvaluationDoc } from "@/integrations/firebase/types";

const EVAL_SYSTEM = `You are an SSLC Karnataka board examiner. Evaluate a student's
handwritten answer. Reply STRICTLY as JSON:
{
  "predictedMarks": number, "maxMarks": number,
  "rubricScores": [{"label": string, "score": number, "max": number}],
  "missingSteps": string[], "formulaIssues": string[],
  "suggestions": string[], "summary": string
}`;

type Eval = Omit<AiEvaluationDoc, "id" | "userId" | "createdAt"> & { attemptId: string };

export function EvaluationWorkspace({ scan }: { scan: ScanDoc }) {
  const run = useServerFn(runSemanticReasoning);
  const actions = usePostSolveActions(scan);
  const [answer, setAnswer] = useState("");
  const [evalRes, setEvalRes] = useState<Eval | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function evaluate() {
    setBusy(true);
    setErr(null);
    try {
      const u = auth.currentUser;
      const idToken = u ? await u.getIdToken() : null;
      if (!idToken) throw new Error("Sign in to use AI evaluation.");
      const r = await run({
        data: {
          idToken,
          systemPrompt: EVAL_SYSTEM,
          grounding: `Question: ${scan.extractedText}`,
          messages: [{ role: "user", content: `Student answer:\n"""\n${answer}\n"""` }],
          responseFormat: "json_object",
          temperature: 0.2,
        },
      });
      if (!r.ok) throw new Error(r.error);
      const parsed = safeParse(r.content);
      if (!parsed) throw new Error("Aura couldn't read the rubric back.");
      const e: Eval = { ...parsed, scanId: scan.id, attemptId: `scan_${scan.id}` };
      setEvalRes(e);
      await actions.saveEvaluation(e);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Evaluation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3">
      <div className="rounded-3xl border border-border/60 bg-card p-4 shadow-soft">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-brand">
          <Sparkles className="h-3.5 w-3.5" /> Handwritten answer evaluation
        </div>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Paste or type your written answer below — Aura will mark it like a Karnataka examiner.
        </p>
        <Textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={6}
          placeholder="Type your answer here…"
          className="mt-3 resize-none rounded-2xl"
        />
        {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
        <Button
          onClick={evaluate}
          disabled={busy || answer.trim().length < 4}
          className="mt-3 w-full rounded-2xl gradient-brand text-brand-foreground shadow-soft press"
        >
          {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Evaluating…</> : "Evaluate my answer"}
        </Button>
      </div>

      {evalRes && <EvaluationCard e={evalRes} />}
    </section>
  );
}

function EvaluationCard({ e }: { e: Eval }) {
  const pct = e.maxMarks ? Math.round((e.predictedMarks / e.maxMarks) * 100) : 0;
  return (
    <article className="space-y-3 rounded-3xl border border-border/60 bg-card p-4 shadow-soft animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-brand" />
          <span className="font-display text-sm font-semibold text-foreground">Predicted score</span>
        </div>
        <div className="text-right">
          <div className="font-display text-2xl font-bold text-foreground">
            {e.predictedMarks}<span className="text-sm text-muted-foreground"> / {e.maxMarks}</span>
          </div>
          <div className="text-[11px] text-muted-foreground">{pct}%</div>
        </div>
      </div>
      {e.summary && (
        <p className="rounded-2xl bg-secondary/40 p-3 text-[13px] text-foreground/90">{e.summary}</p>
      )}
      {e.rubricScores?.length > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Rubric</div>
          {e.rubricScores.map((r) => (
            <div key={r.label}>
              <div className="mb-1 flex items-center justify-between text-[12px]">
                <span className="text-foreground">{r.label}</span>
                <span className="font-medium text-muted-foreground">{r.score}/{r.max}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full gradient-brand" style={{ width: `${r.max ? (r.score / r.max) * 100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
      {e.missingSteps?.length > 0 && (
        <Bullets icon={<ListChecks className="h-3.5 w-3.5" />} title="Missing steps" tone="warning" items={e.missingSteps} />
      )}
      {e.formulaIssues?.length > 0 && (
        <Bullets icon={<AlertOctagon className="h-3.5 w-3.5" />} title="Formula issues" tone="destructive" items={e.formulaIssues} />
      )}
      {e.suggestions?.length > 0 && (
        <Bullets icon={<Sparkles className="h-3.5 w-3.5" />} title="Presentation tips" tone="brand" items={e.suggestions} />
      )}
    </article>
  );
}

function Bullets({ icon, title, items, tone }: { icon: React.ReactNode; title: string; items: string[]; tone: "warning" | "destructive" | "brand" }) {
  const toneCls = tone === "warning" ? "text-warning" : tone === "destructive" ? "text-destructive" : "text-brand";
  return (
    <div>
      <div className={`mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide ${toneCls}`}>
        {icon} {title}
      </div>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="rounded-xl bg-secondary/30 px-3 py-1.5 text-[12.5px] leading-relaxed text-foreground/90">
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function safeParse(raw: string): Omit<AiEvaluationDoc, "id" | "userId" | "createdAt" | "scanId" | "attemptId"> | null {
  try {
    const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
    const j = JSON.parse(cleaned);
    return {
      predictedMarks: Number(j.predictedMarks) || 0,
      maxMarks: Number(j.maxMarks) || 0,
      rubricScores: Array.isArray(j.rubricScores) ? j.rubricScores : [],
      missingSteps: Array.isArray(j.missingSteps) ? j.missingSteps : [],
      formulaIssues: Array.isArray(j.formulaIssues) ? j.formulaIssues : [],
      suggestions: Array.isArray(j.suggestions) ? j.suggestions : [],
      summary: typeof j.summary === "string" ? j.summary : undefined,
    };
  } catch {
    return null;
  }
}