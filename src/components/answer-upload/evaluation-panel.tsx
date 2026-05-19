import { useMemo } from "react";
import {
  Award,
  CheckCircle2,
  Lightbulb,
  Loader2,
  Sparkles,
  Target,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  EvaluationDoc,
  EvaluationPerQuestion,
} from "@/integrations/firebase/types";
import { cn } from "@/lib/utils";

type Props = {
  evaluation: EvaluationDoc | null;
  loading: boolean;
  running: boolean;
  error: string | null;
  ready: boolean; // attempt is ready_for_evaluation (all pages approved)
  onEvaluate: () => void;
};

/**
 * Lightweight evaluation summary card. Renders:
 *  - empty state with a CTA when no evaluation exists
 *  - spinner while evaluating
 *  - mark breakdown, strengths/mistakes/missing points, presentation +
 *    conceptual feedback, improvement suggestions, per-question breakdown
 */
export function EvaluationPanel({
  evaluation,
  loading,
  running,
  error,
  ready,
  onEvaluate,
}: Props) {
  if (loading) {
    return (
      <Card className="space-y-3 p-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 w-full" />
      </Card>
    );
  }

  if (!evaluation || evaluation.state === "pending") {
    return (
      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">AI evaluation</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          {ready
            ? "All pages are approved. Run AI evaluation to get a score, strengths, mistakes, and improvement tips."
            : "Approve every reviewed page above, then run AI evaluation."}
        </p>
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
        <Button
          size="sm"
          onClick={onEvaluate}
          disabled={!ready || running}
          className="self-start"
        >
          {running ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="mr-1 h-3.5 w-3.5" />
          )}
          Evaluate answer
        </Button>
      </Card>
    );
  }

  if (evaluation.state === "evaluating") {
    return (
      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <h3 className="text-sm font-semibold">Evaluating your answer…</h3>
        </div>
        <Progress value={60} className="h-1.5" />
        <p className="text-xs text-muted-foreground">
          Comparing your text with the model answer and rubric.
        </p>
      </Card>
    );
  }

  if (evaluation.state === "error") {
    return (
      <Card className="space-y-2 p-4">
        <div className="flex items-center gap-2 text-destructive">
          <TriangleAlert className="h-4 w-4" />
          <h3 className="text-sm font-semibold">Evaluation failed</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          {evaluation.error ?? "Something went wrong."}
        </p>
        <Button size="sm" variant="outline" onClick={onEvaluate} disabled={running}>
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <EvaluatedSummary
      evaluation={evaluation}
      running={running}
      onEvaluate={onEvaluate}
    />
  );
}

function EvaluatedSummary({
  evaluation,
  running,
  onEvaluate,
}: {
  evaluation: EvaluationDoc;
  running: boolean;
  onEvaluate: () => void;
}) {
  const pct = evaluation.percentage;
  const tone = useMemo(() => {
    if (pct >= 80) return "text-emerald-600";
    if (pct >= 50) return "text-amber-600";
    return "text-destructive";
  }, [pct]);

  return (
    <div className="space-y-3">
      <Card className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">AI evaluation</h3>
              <Badge variant="outline" className="capitalize">
                {evaluation.engine}
              </Badge>
            </div>
            {evaluation.summary && (
              <p className="mt-1 text-xs text-muted-foreground">
                {evaluation.summary}
              </p>
            )}
          </div>
          <div className="text-right">
            <div className={cn("text-2xl font-bold leading-none", tone)}>
              {evaluation.totalScore}
              <span className="text-sm text-muted-foreground">
                {" "}/ {evaluation.maxScore}
              </span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {pct.toFixed(0)}%
            </div>
          </div>
        </div>
        <Progress value={pct} className="h-2" />
        <div className="flex justify-end">
          <Button size="sm" variant="ghost" onClick={onEvaluate} disabled={running}>
            {running ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-1 h-3.5 w-3.5" />
            )}
            Re-evaluate
          </Button>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <FeedbackList
          icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
          title="Strengths"
          items={evaluation.strengths}
          emptyLabel="No clear strengths detected yet."
        />
        <FeedbackList
          icon={<XCircle className="h-3.5 w-3.5 text-destructive" />}
          title="Mistakes"
          items={evaluation.mistakes}
          emptyLabel="No major mistakes."
        />
        <FeedbackList
          icon={<Target className="h-3.5 w-3.5 text-amber-600" />}
          title="Missing points"
          items={evaluation.missingPoints}
          emptyLabel="Nothing important missing."
        />
        <FeedbackList
          icon={<Lightbulb className="h-3.5 w-3.5 text-primary" />}
          title="Improvement tips"
          items={evaluation.improvementSuggestions}
          emptyLabel="No additional tips."
        />
      </div>

      {(evaluation.presentationFeedback || evaluation.conceptualFeedback) && (
        <Card className="grid gap-2 p-4 sm:grid-cols-2">
          {evaluation.presentationFeedback && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">
                Presentation
              </p>
              <p className="text-xs">{evaluation.presentationFeedback}</p>
            </div>
          )}
          {evaluation.conceptualFeedback && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">
                Concepts
              </p>
              <p className="text-xs">{evaluation.conceptualFeedback}</p>
            </div>
          )}
        </Card>
      )}

      {evaluation.weakConcepts.length > 0 && (
        <Card className="space-y-2 p-4">
          <p className="text-xs font-semibold text-muted-foreground">
            Weak concepts
          </p>
          <div className="flex flex-wrap gap-1.5">
            {evaluation.weakConcepts.map((w) => (
              <Badge
                key={w.topic}
                variant="outline"
                className={cn(
                  "text-xs",
                  w.severity === "high" &&
                    "border-destructive/40 text-destructive",
                  w.severity === "medium" &&
                    "border-amber-500/40 text-amber-700",
                  w.severity === "low" &&
                    "border-emerald-500/40 text-emerald-700",
                )}
              >
                {w.topic}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {evaluation.perQuestion.length > 0 && (
        <Card className="space-y-3 p-4">
          <p className="text-xs font-semibold text-muted-foreground">
            Mark breakdown
          </p>
          <div className="space-y-3">
            {evaluation.perQuestion.map((q, i) => (
              <PerQuestionRow key={q.imageId ?? i} q={q} index={i} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function FeedbackList({
  icon,
  title,
  items,
  emptyLabel,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <Card className="space-y-2 p-3">
      <div className="flex items-center gap-1.5">
        {icon}
        <p className="text-xs font-semibold">{title}</p>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="space-y-1">
          {items.map((it, i) => (
            <li key={i} className="text-xs leading-snug text-foreground/90">
              • {it}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function PerQuestionRow({
  q,
  index,
}: {
  q: EvaluationPerQuestion;
  index: number;
}) {
  const pct = q.maxScore ? (q.score / q.maxScore) * 100 : 0;
  return (
    <div className="space-y-1.5 rounded-md border p-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">
          Page {index + 1}
          {q.questionId ? ` · ${q.questionId}` : ""}
        </span>
        <span className="text-muted-foreground">
          {q.score} / {q.maxScore}
        </span>
      </div>
      <Progress value={pct} className="h-1" />
      <div className="flex flex-wrap gap-1 pt-1">
        {q.rubric.map((r) => (
          <span
            key={r.key}
            className="rounded-full bg-muted px-2 py-0.5 text-[10px]"
            title={r.comment}
          >
            {r.label}: {r.score.toFixed(1)}
          </span>
        ))}
      </div>
    </div>
  );
}