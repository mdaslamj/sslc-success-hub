import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Brain,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Target,
  Timer,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRecommendations } from "@/hooks/use-recommendations";
import type {
  RecommendationDoc,
  RecommendationKind,
} from "@/integrations/firebase/types";

/**
 * Lightweight, drop-in recommendation widgets. Each is self-contained and
 * reads from `useRecommendations()` so dashboards can compose them without
 * prop-drilling.
 */

function CardShell({
  title,
  icon,
  right,
  children,
  className = "",
}: {
  title: string;
  icon: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-3xl border border-border/60 bg-card p-5 shadow-card ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold flex items-center gap-2">
          <span className="text-brand">{icon}</span>
          {title}
        </h3>
        {right}
      </div>
      {children}
    </div>
  );
}

const KIND_ICON: Record<RecommendationKind, React.ReactNode> = {
  next_chapter: <BookOpen className="h-3.5 w-3.5" />,
  revision_due: <RotateCcw className="h-3.5 w-3.5" />,
  weak_topic: <TrendingDown className="h-3.5 w-3.5" />,
  quiz_suggestion: <Target className="h-3.5 w-3.5" />,
  focus_boost: <Timer className="h-3.5 w-3.5" />,
  streak_guard: <Sparkles className="h-3.5 w-3.5" />,
  consistency: <TrendingUp className="h-3.5 w-3.5" />,
  subject_difficulty: <Brain className="h-3.5 w-3.5" />,
  resource: <BookOpen className="h-3.5 w-3.5" />,
};

function RecommendationRow({
  rec,
  onDismiss,
  onAct,
}: {
  rec: RecommendationDoc;
  onDismiss: (id: string) => void;
  onAct: (id: string) => void;
}) {
  const cta = rec.cta;
  return (
    <li className="group rounded-xl border border-border/50 bg-background/40 p-3 transition hover:border-brand/40">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand">
          {KIND_ICON[rec.kind] ?? <Lightbulb className="h-3.5 w-3.5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-xs font-semibold">{rec.title}</p>
            <Badge variant="outline" className="rounded-full px-1.5 py-0 text-[9px] tabular-nums">
              {rec.score}
            </Badge>
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            {rec.body}
          </p>
          {rec.reasons.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {rec.reasons.map((r) => (
                <span
                  key={r}
                  className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground"
                >
                  {r}
                </span>
              ))}
            </div>
          )}
          {cta && (
            <div className="mt-2 flex items-center gap-2">
              {cta.route ? (
                <Link
                  // TanStack Link accepts a literal route string; cast for the dynamic case.
                  to={cta.route as never}
                  params={cta.params as never}
                  onClick={() => onAct(rec.id)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-brand hover:underline"
                >
                  {cta.label} <ArrowRight className="h-3 w-3" />
                </Link>
              ) : (
                <span className="text-[11px] font-medium text-brand">{cta.label}</span>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(rec.id)}
          className="opacity-0 transition group-hover:opacity-100"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
        </button>
      </div>
    </li>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border/60 p-4 text-center text-[11px] text-muted-foreground">
      {text}
    </div>
  );
}

/** Top-N recommendation feed. */
export function RecommendationsWidget({ limit = 5 }: { limit?: number }) {
  const r = useRecommendations();
  const visible = r.recommendations.slice(0, limit);
  return (
    <CardShell
      title="Smart Recommendations"
      icon={<Sparkles className="h-4 w-4" />}
      right={
        <Badge variant="outline" className="rounded-full text-[10px]">
          {r.recommendations.length}
        </Badge>
      }
    >
      {visible.length === 0 ? (
        <EmptyState text={r.loading ? "Analysing your activity…" : "No recommendations right now."} />
      ) : (
        <ul className="space-y-1.5">
          {visible.map((rec) => (
            <RecommendationRow
              key={rec.id}
              rec={rec}
              onAct={r.act}
              onDismiss={r.dismiss}
            />
          ))}
        </ul>
      )}
    </CardShell>
  );
}

/** Compact single-card view — the highest-scoring active rec. */
export function TopRecommendationWidget() {
  const r = useRecommendations();
  const top = r.topRecommendation;
  return (
    <CardShell title="Top Suggestion" icon={<Lightbulb className="h-4 w-4" />}>
      {!top ? (
        <EmptyState text="No active suggestion." />
      ) : (
        <ul className="space-y-0">
          <RecommendationRow rec={top} onAct={r.act} onDismiss={r.dismiss} />
        </ul>
      )}
    </CardShell>
  );
}

/** Daily insight rollup — headline + bullets + lightweight predicted band. */
export function AiInsightWidget() {
  const r = useRecommendations();
  const insight = r.insight;
  if (!insight) {
    return (
      <CardShell title="AI Insight" icon={<Brain className="h-4 w-4" />}>
        <EmptyState text={r.loading ? "Generating insight…" : "No data yet."} />
      </CardShell>
    );
  }
  const bandColor =
    insight.predictedScoreBand === "high"
      ? "text-success"
      : insight.predictedScoreBand === "mid"
        ? "text-warning"
        : insight.predictedScoreBand === "low"
          ? "text-destructive"
          : "text-muted-foreground";
  return (
    <CardShell
      title="AI Insight"
      icon={<Brain className="h-4 w-4" />}
      right={
        insight.predictedScoreBand ? (
          <Badge variant="outline" className={`rounded-full text-[10px] uppercase ${bandColor}`}>
            {insight.predictedScoreBand}
          </Badge>
        ) : null
      }
    >
      <p className="text-xs font-medium leading-snug">{insight.headline}</p>
      <ul className="mt-3 space-y-1">
        {insight.bullets.map((b) => (
          <li
            key={b}
            className="flex items-start gap-2 text-[11px] text-muted-foreground"
          >
            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-brand" />
            {b}
          </li>
        ))}
      </ul>
    </CardShell>
  );
}

/** Convenience: render the recommendation stack in a responsive grid. */
export function RecommendationWidgetGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <RecommendationsWidget />
      <AiInsightWidget />
    </div>
  );
}