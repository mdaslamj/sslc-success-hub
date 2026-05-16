import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ProgressRing } from "@/components/widgets/progress-ring";
import { subjects as initialSubjects, gradeFor } from "@/lib/mock-data";
import { Target, TrendingUp, Trophy } from "lucide-react";
import { Slider } from "@/components/ui/slider";

export const Route = createFileRoute("/targets")({
  head: () => ({
    meta: [
      { title: "Targets — VidyaPath" },
      { name: "description", content: "Set subject-wise and overall SSLC target marks. Track gap and probability." },
    ],
  }),
  component: TargetsPage,
});

function TargetsPage() {
  const [subjects, setSubjects] = useState(initialSubjects);

  const avgTarget = Math.round(subjects.reduce((a, s) => a + s.target, 0) / subjects.length);
  const avgPredicted = Math.round(subjects.reduce((a, s) => a + s.predicted, 0) / subjects.length);
  const gap = avgTarget - avgPredicted;
  const probability = Math.max(20, Math.min(95, 90 - gap * 3));

  return (
    <DashboardLayout title="Targets">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <h1 className="font-display text-3xl font-bold tracking-tight">Target Score System</h1>
          <p className="text-sm text-muted-foreground">Set your goals. We'll track the gap and predict your probability.</p>
        </header>

        {/* Top summary */}
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl gradient-ocean p-6 text-white shadow-glow">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/70">
              <Trophy className="h-3.5 w-3.5" /> Overall Target
            </div>
            <div className="mt-3 flex items-end gap-3">
              <div className="font-display text-5xl font-bold">{avgTarget}%</div>
              <div className="pb-2 text-sm text-white/70">Grade {gradeFor(avgTarget)}</div>
            </div>
            <p className="mt-3 text-sm text-white/80">
              You need <span className="font-semibold text-brand-glow">{gap} more points</span> on average to reach this target.
            </p>
          </div>

          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card flex items-center justify-around">
            <ProgressRing value={avgPredicted} sublabel="Predicted" />
            <div className="text-center">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Confidence</div>
              <div className="font-display text-2xl font-bold gradient-text">{probability}%</div>
              <div className="text-[11px] text-muted-foreground mt-1">of hitting target</div>
            </div>
          </div>

          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" /> Improvement plan
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand shrink-0" /> Daily 2hr math practice</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand shrink-0" /> 3 mock tests / week</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand shrink-0" /> Weak topic revision on weekends</li>
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand shrink-0" /> 7-day Kannada grammar sprint</li>
            </ul>
          </div>
        </section>

        {/* Per subject targets */}
        <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
          <div className="mb-5 flex items-center gap-2">
            <Target className="h-4 w-4 text-brand" />
            <h3 className="font-display text-lg font-semibold">Per-subject Targets</h3>
          </div>
          <div className="space-y-5">
            {subjects.map((s, idx) => {
              const sGap = s.target - s.predicted;
              return (
                <div key={s.id} className="rounded-2xl border border-border/60 bg-background/50 p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-xl text-lg font-bold"
                        style={{ background: `color-mix(in oklab, ${s.color} 18%, transparent)`, color: s.color }}
                      >
                        {s.emoji}
                      </div>
                      <div>
                        <div className="font-display font-semibold">{s.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Predicted {s.predicted}% · Gap {sGap > 0 ? `+${sGap}` : sGap} pts
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">Target</div>
                      <div className="font-display text-2xl font-bold gradient-text">{s.target}%</div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Slider
                      value={[s.target]}
                      min={50}
                      max={100}
                      step={1}
                      onValueChange={(v) =>
                        setSubjects((prev) => prev.map((x, i) => (i === idx ? { ...x, target: v[0] } : x)))
                      }
                    />
                    <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                      <span>50%</span>
                      <span>Predicted ({s.predicted}%)</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}