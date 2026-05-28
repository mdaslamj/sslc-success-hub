import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ProgressRing } from "@/components/widgets/progress-ring";
import { subjects as initialSubjects, gradeFor, type Subject } from "@/lib/mock-data";
import {
  Target,
  TrendingUp,
  Trophy,
  Sparkles,
  RotateCcw,
  Save,
} from "lucide-react";
import { getSubjectStatus } from "@/lib/taskPriorityEngine";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  Cell,
  ReferenceLine,
} from "recharts";

export const Route = createFileRoute("/targets")({
  head: () => ({
    meta: [
      { title: "Aura — Target Score" },
      {
        name: "description",
        content:
          "Set subject-wise and overall SSLC targets. Track target vs actual progress and AI probability of achieving your goals.",
      },
    ],
  }),
  component: TargetsPage,
});

const STORAGE_KEY = "vidyapath.targets.v1";

/** Probability a student hits their target given current predicted score.
 *  Logistic curve around the gap. Gap <= 0 → very high; large gap → low. */
function probabilityFor(target: number, predicted: number, mastery: number) {
  const gap = target - predicted;
  // Logistic: 1 / (1 + e^(k*(gap - shift)))
  const k = 0.18;
  const shift = 2; // small positive gap still feasible
  const base = 1 / (1 + Math.exp(k * (gap - shift)));
  // Mastery nudges confidence ±8 pts
  const adj = base * 100 + (mastery - 70) * 0.15;
  return Math.round(Math.max(5, Math.min(98, adj)));
}

function TargetsPage() {
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
  const [overallOverride, setOverallOverride] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          targets?: Record<string, number>;
          overall?: number | null;
        };
        if (parsed.targets) {
          setSubjects((prev) =>
            prev.map((s) => ({ ...s, target: parsed.targets?.[s.id] ?? s.target })),
          );
        }
        if (typeof parsed.overall === "number") setOverallOverride(parsed.overall);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const avgTarget = useMemo(
    () => Math.round(subjects.reduce((a, s) => a + s.target, 0) / subjects.length),
    [subjects],
  );
  const avgPredicted = useMemo(
    () => Math.round(subjects.reduce((a, s) => a + s.predicted, 0) / subjects.length),
    [subjects],
  );
  const overallTarget = overallOverride ?? avgTarget;
  const overallGap = overallTarget - avgPredicted;
  const overallProbability = useMemo(() => {
    const probs = subjects.map((s) => probabilityFor(s.target, s.predicted, s.mastery));
    return Math.round(probs.reduce((a, b) => a + b, 0) / probs.length);
  }, [subjects]);

  const chartData = subjects.map((s) => ({
    name: s.name.split(" ")[0],
    Target: s.target,
    Predicted: s.predicted,
    Mastery: s.mastery,
    color: s.color,
  }));

  function updateSubjectTarget(id: string, val: number) {
    setSubjects((prev) => prev.map((s) => (s.id === id ? { ...s, target: val } : s)));
  }

  function resetTargets() {
    setSubjects(initialSubjects);
    setOverallOverride(null);
    localStorage.removeItem(STORAGE_KEY);
    toast.success("Targets reset to default");
  }

  function saveTargets() {
    const payload = {
      targets: Object.fromEntries(subjects.map((s) => [s.id, s.target])),
      overall: overallOverride,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    toast.success("Targets saved", {
      description: `Aiming for ${overallTarget}% overall · ${overallProbability}% probability`,
    });
  }

  function applyOverallToAll(val: number) {
    setOverallOverride(val);
    setSubjects((prev) => prev.map((s) => ({ ...s, target: val })));
  }

  return (
    <DashboardLayout title="Targets">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              <Target className="h-3.5 w-3.5" /> Target Score System
            </div>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
              Set your goals. <span className="gradient-text">Hit your grade.</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Adjust per-subject targets to see live gap analysis and AI probability of success.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={resetTargets} className="rounded-full">
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
            </Button>
            <Button size="sm" onClick={saveTargets} className="rounded-full">
              <Save className="mr-1.5 h-3.5 w-3.5" /> Save Targets
            </Button>
          </div>
        </header>

        {/* Top summary */}
        <section className="grid gap-4 lg:grid-cols-3">
          {/* Overall target card */}
          <div className="rounded-3xl gradient-ocean p-6 text-white shadow-glow relative overflow-hidden">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-glow/30 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/70">
                <Trophy className="h-3.5 w-3.5" /> Overall Target
              </div>
              <div className="mt-3 flex items-end gap-3">
                <div className="font-display text-5xl font-bold">{overallTarget}%</div>
                <div className="pb-2 text-sm text-white/70">Grade {gradeFor(overallTarget)}</div>
              </div>
              <div className="mt-5">
                <Slider
                  value={[overallTarget]}
                  min={50}
                  max={100}
                  step={1}
                  onValueChange={(v) => applyOverallToAll(v[0])}
                />
                <div className="mt-2 flex justify-between text-[11px] text-white/60">
                  <span>50%</span>
                  <span>Current avg target: {avgTarget}%</span>
                  <span>100%</span>
                </div>
              </div>
              <p className="mt-4 text-sm text-white/80">
                {overallGap > 0 ? (
                  <>
                    You need{" "}
                    <span className="font-semibold text-brand-glow">+{overallGap} pts</span> on
                    average to hit this target.
                  </>
                ) : (
                  <>You're already projected to exceed this target. 🎉</>
                )}
              </p>
            </div>
          </div>

          {/* Probability gauge */}
          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card flex flex-col items-center justify-center">
            <ProgressRing value={overallProbability} sublabel="Probability" />
            <div className="mt-3 text-center">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">
                AI Confidence
              </div>
              <div className="font-display text-lg font-semibold">
                {overallProbability >= 80
                  ? "Highly likely"
                  : overallProbability >= 55
                    ? "Stretch goal"
                    : "Aggressive target"}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Predicted {avgPredicted}% · Target {overallTarget}%
              </p>
            </div>
          </div>

          {/* Predicted vs Target grade card */}
          <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" /> Grade trajectory
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border/60 bg-background/40 p-3 text-center">
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  Predicted
                </div>
                <div className="mt-1 font-display text-3xl font-bold">{avgPredicted}%</div>
                <Badge variant="secondary" className="mt-1">
                  Grade {gradeFor(avgPredicted)}
                </Badge>
              </div>
              <div className="rounded-2xl gradient-ocean p-3 text-center text-white">
                <div className="text-[11px] uppercase tracking-widest text-white/80">Target</div>
                <div className="mt-1 font-display text-3xl font-bold">{overallTarget}%</div>
                <Badge className="mt-1 bg-white/20 text-white hover:bg-white/20 border-0">
                  Grade {gradeFor(overallTarget)}
                </Badge>
              </div>
            </div>
            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress to target</span>
                <span>{Math.min(100, Math.round((avgPredicted / overallTarget) * 100))}%</span>
              </div>
              <Progress value={Math.min(100, (avgPredicted / overallTarget) * 100)} />
            </div>
          </div>
        </section>

        {/* Target vs Actual chart */}
        <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-display text-lg font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand" /> Target vs Actual Progress
              </h3>
              <p className="text-xs text-muted-foreground">
                Predicted score, mastery and your target side-by-side per subject.
              </p>
            </div>
            <Badge variant="outline" className="rounded-full">
              Avg gap: {avgTarget - avgPredicted} pts
            </Badge>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap={18}>
                <CartesianGrid stroke="var(--border)" strokeOpacity={0.3} vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine
                  y={overallTarget}
                  stroke="var(--brand)"
                  strokeDasharray="4 4"
                  label={{
                    value: `Overall ${overallTarget}%`,
                    fill: "var(--brand)",
                    fontSize: 11,
                    position: "right",
                  }}
                />
                <Bar dataKey="Mastery" fill="hsl(var(--muted))" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Predicted" radius={[6, 6, 0, 0]}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.color} fillOpacity={0.55} />
                  ))}
                </Bar>
                <Bar dataKey="Target" radius={[6, 6, 0, 0]}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Per subject targets */}
        <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
          <div className="mb-5 flex items-center gap-2">
            <Target className="h-4 w-4 text-brand" />
            <h3 className="font-display text-lg font-semibold">Per-subject Targets</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {subjects.map((s) => {
              const sGap = s.target - s.predicted;
              const prob = probabilityFor(s.target, s.predicted, s.mastery);
              const status = getSubjectStatus(s.predicted, s.target);
              return (
                <div
                  key={s.id}
                  className="rounded-2xl border border-border/60 bg-background/40 p-4 transition hover:border-brand/40 hover:shadow-card"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-xl text-xl font-bold"
                        style={{
                          background: `color-mix(in oklab, ${s.color} 18%, transparent)`,
                          color: s.color,
                        }}
                      >
                        {s.emoji}
                      </div>
                      <div>
                        <div className="font-display font-semibold">{s.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Predicted {s.predicted}% · Mastery {s.mastery}%
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className="rounded-full border-0"
                      style={{ color: status.color, backgroundColor: status.bg }}
                    >
                      {status.label}
                    </Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-muted/40 p-2">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Target
                      </div>
                      <div className="font-display text-lg font-bold" style={{ color: s.color }}>
                        {s.target}%
                      </div>
                    </div>
                    <div className="rounded-xl bg-muted/40 p-2">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Gap
                      </div>
                      <div
                        className={`font-display text-lg font-bold ${
                          sGap > 0 ? "text-warning" : "text-success"
                        }`}
                      >
                        {sGap > 0 ? `+${sGap}` : sGap}
                      </div>
                    </div>
                    <div className="rounded-xl bg-muted/40 p-2">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Probability
                      </div>
                      <div className="font-display text-lg font-bold gradient-text">{prob}%</div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Slider
                      value={[s.target]}
                      min={50}
                      max={100}
                      step={1}
                      onValueChange={(v) => updateSubjectTarget(s.id, v[0])}
                    />
                    <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                      <span>50%</span>
                      <span>Predicted: {s.predicted}%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-muted-foreground">
                    {sGap <= 0
                      ? `✨ You're on track. Lock it in by maintaining ${s.predicted}%+ in mocks.`
                      : sGap <= 5
                        ? `Small push: focus on ${s.weakTopics[0] ?? "weak areas"} to close the gap.`
                        : sGap <= 10
                          ? `Stretch goal: weekly mock + revise ${s.weakTopics.slice(0, 2).join(", ")}.`
                          : `Aggressive: needs a 6-week intensive plan on ${s.weakTopics.join(", ")}.`}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {!hydrated && <div className="sr-only">Loading saved targets…</div>}
      </div>
    </DashboardLayout>
  );
}
