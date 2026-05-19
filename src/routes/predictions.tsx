import { createFileRoute, Link } from "@tanstack/react-router";
import { Brain, TrendingUp, Target, ArrowLeft } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatCard } from "@/components/widgets/stat-card";
import { Button } from "@/components/ui/button";
import {
  AiInsightWidget,
  RecommendationsWidget,
  TopRecommendationWidget,
} from "@/components/widgets/recommendation-widgets";
import {
  subjects,
  overallPrepScore,
  predictedPercentage,
  targetPercentage,
  gradeFor,
} from "@/lib/mock-data";

export const Route = createFileRoute("/predictions")({
  head: () => ({
    meta: [
      { title: "AI Prediction — VidyaPath SSLC Prep" },
      {
        name: "description",
        content:
          "AI-powered predicted percentage, grade band and personalised study recommendations for your SSLC prep.",
      },
    ],
  }),
  component: PredictionsPage,
});

function PredictionsPage() {
  const gap = targetPercentage - predictedPercentage;
  return (
    <DashboardLayout title="AI Prediction">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">
              AI Prediction
            </h1>
            <p className="text-sm text-muted-foreground">
              Rule-based forecast from your quiz accuracy, streak and progress.
            </p>
          </div>
          <Button asChild variant="ghost" size="sm" className="gap-1">
            <Link to="/">
              <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
            </Link>
          </Button>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="AI Prep Score"
            value={`${overallPrepScore}`}
            hint="Overall readiness"
            icon={<Brain className="h-4 w-4" />}
            accent="brand"
          />
          <StatCard
            label="Predicted %"
            value={`${predictedPercentage}%`}
            hint={`Grade ${gradeFor(predictedPercentage)}`}
            icon={<TrendingUp className="h-4 w-4" />}
            accent="info"
          />
          <StatCard
            label="Target %"
            value={`${targetPercentage}%`}
            hint={`Gap: ${gap} pts`}
            icon={<Target className="h-4 w-4" />}
            accent="warning"
          />
          <StatCard
            label="Target Grade"
            value={gradeFor(targetPercentage)}
            hint="Goal band"
            icon={<Target className="h-4 w-4" />}
            accent="success"
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <AiInsightWidget />
          <TopRecommendationWidget />
        </section>

        <section>
          <RecommendationsWidget limit={8} />
        </section>

        <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
          <h3 className="font-display text-lg font-semibold">
            Subject-wise predicted marks
          </h3>
          <p className="text-xs text-muted-foreground">
            Predicted vs target across all subjects.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {subjects.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-border/60 bg-background/60 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{s.emoji}</span>
                    <span className="font-display font-semibold">{s.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {s.predicted}% / {s.target}%
                  </span>
                </div>
                <div className="relative mt-3 h-2 rounded-full bg-muted">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: `${s.predicted}%`,
                      background: `linear-gradient(90deg, ${s.color}, var(--brand-glow))`,
                    }}
                  />
                  <div
                    className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rounded bg-foreground"
                    style={{ left: `${s.target}%` }}
                    title={`Target: ${s.target}%`}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}