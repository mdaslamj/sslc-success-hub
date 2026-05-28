import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ProgressRing } from "@/components/widgets/progress-ring";
import { SSLC_SUBJECTS } from "@/data/sslc-academic-catalog";
import { buildConstellationView } from "@/core/academic-state/constellationView";
import { computeProbabilitySnapshot } from "@/core/academic-state/probabilityEngine";
import { useAuraEngines } from "@/hooks/useAuraEngines";
import {
  Target,
  TrendingUp,
  Trophy,
  Sparkles,
  RotateCcw,
  Check,
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

const DEFAULT_SUBJECT_TARGETS = Object.fromEntries(
  SSLC_SUBJECTS.map((subject) => [subject.id, subject.target]),
) as Record<string, number>;

function gradeFor(pct: number): string {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C";
  return "D";
}

function buildDefaultSubjectTargets(
  profileTargets?: Record<string, number>,
): Record<string, number> {
  return {
    ...DEFAULT_SUBJECT_TARGETS,
    ...(profileTargets ?? {}),
  };
}

type TargetSubjectRow = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  predicted: number;
  mastery: number;
  weakTopics: string[];
  target: number;
};

function TargetsPage() {
  const { profile, projection, target, isLoading, updateProfile } = useAuraEngines();
  const [sliderTargets, setSliderTargets] = useState<Record<string, number>>({});
  const [savedFlash, setSavedFlash] = useState(false);

  const constellation = useMemo(
    () => buildConstellationView(profile, projection),
    [profile, projection],
  );

  useEffect(() => {
    if (!profile?.student) return;
    setSliderTargets(buildDefaultSubjectTargets(profile.subjectTargets));
  }, [profile?.student, profile.subjectTargets]);

  useEffect(() => {
    if (!savedFlash) return;
    const timer = setTimeout(() => setSavedFlash(false), 2000);
    return () => clearTimeout(timer);
  }, [savedFlash]);

  const subjects: TargetSubjectRow[] = useMemo(
    () =>
      SSLC_SUBJECTS.map((catalogSubject) => {
        const view = constellation.subjects[catalogSubject.id];
        return {
          id: catalogSubject.id,
          name: catalogSubject.name,
          emoji: catalogSubject.emoji,
          color: view?.color ?? catalogSubject.color,
          predicted: view?.predicted ?? catalogSubject.predicted,
          mastery: view?.mastery ?? catalogSubject.mastery,
          weakTopics: catalogSubject.weakTopics,
          target: sliderTargets[catalogSubject.id] ?? catalogSubject.target,
        };
      }),
    [constellation.subjects, sliderTargets],
  );

  const avgTarget = useMemo(
    () =>
      subjects.length
        ? Math.round(subjects.reduce((sum, subject) => sum + subject.target, 0) / subjects.length)
        : 0,
    [subjects],
  );
  const avgPredicted = useMemo(
    () =>
      subjects.length
        ? Math.round(
            subjects.reduce((sum, subject) => sum + subject.predicted, 0) / subjects.length,
          )
        : 0,
    [subjects],
  );
  const overallTarget = avgTarget || profile.student.targetScore || 90;
  const overallGap = target?.gapPercentage ?? Math.max(0, overallTarget - avgPredicted);
  const overallProbability = useMemo(() => {
    const probs = subjects.map((subject) =>
      computeProbabilitySnapshot(subject.target, subject.predicted, subject.mastery),
    );
    return probs.length
      ? Math.round(probs.reduce((sum, value) => sum + value, 0) / probs.length)
      : 0;
  }, [subjects]);

  const chartData = subjects.map((subject) => ({
    name: subject.name.split(" ")[0],
    Target: subject.target,
    Predicted: subject.predicted,
    Mastery: subject.mastery,
    color: subject.color,
  }));

  function flashSaved() {
    setSavedFlash(true);
  }

  function handleTargetChange(subjectId: string, value: number) {
    const nextSubjectTargets = {
      ...buildDefaultSubjectTargets(profile.subjectTargets),
      ...sliderTargets,
      [subjectId]: value,
    };
    setSliderTargets(nextSubjectTargets);
    updateProfile({ subjectTargets: nextSubjectTargets });
    flashSaved();
  }

  function applyOverallToAll(value: number) {
    const nextSubjectTargets = Object.fromEntries(
      SSLC_SUBJECTS.map((subject) => [subject.id, value]),
    ) as Record<string, number>;
    setSliderTargets(nextSubjectTargets);
    updateProfile({
      student: { ...profile.student, targetScore: value },
      subjectTargets: nextSubjectTargets,
    });
    flashSaved();
  }

  function resetTargets() {
    setSliderTargets(DEFAULT_SUBJECT_TARGETS);
    updateProfile({
      student: { ...profile.student, targetScore: 90 },
      subjectTargets: DEFAULT_SUBJECT_TARGETS,
    });
    toast.success("Targets reset to default");
    flashSaved();
  }

  if (isLoading) {
    return (
      <DashboardLayout title="Targets">
        <div
          className="mx-auto flex min-h-[480px] max-w-7xl items-center justify-center rounded-3xl border border-border/60 bg-card text-sm text-muted-foreground"
          aria-busy="true"
        >
          Loading targets…
        </div>
      </DashboardLayout>
    );
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
          <div className="flex items-center gap-2">
            {savedFlash && (
              <span className="flex items-center gap-1 text-xs font-medium text-success">
                <Check className="h-3.5 w-3.5" /> Saved
              </span>
            )}
            <Button variant="outline" size="sm" onClick={resetTargets} className="rounded-full">
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
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
                  onValueChange={(value) => applyOverallToAll(value[0])}
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
                    <span className="font-semibold text-brand-glow">+{overallGap.toFixed(1)} pts</span>{" "}
                    on average to hit this target.
                  </>
                ) : (
                  <>You&apos;re already projected to exceed this target. 🎉</>
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
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} fillOpacity={0.55} />
                  ))}
                </Bar>
                <Bar dataKey="Target" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
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
            {subjects.map((subject) => {
              const engineGap = target.bySubject?.[subject.id];
              const subjectGap =
                engineGap?.gap ?? Math.max(0, subject.target - subject.predicted);
              const prob = computeProbabilitySnapshot(
                subject.target,
                subject.predicted,
                subject.mastery,
              );
              const status = getSubjectStatus(subject.predicted, subject.target);

              return (
                <div
                  key={subject.id}
                  className="rounded-2xl border border-border/60 bg-background/40 p-4 transition hover:border-brand/40 hover:shadow-card"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-xl text-xl font-bold"
                        style={{
                          background: `color-mix(in oklab, ${subject.color} 18%, transparent)`,
                          color: subject.color,
                        }}
                      >
                        {subject.emoji}
                      </div>
                      <div>
                        <div className="font-display font-semibold">{subject.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Predicted {subject.predicted}% · Mastery {subject.mastery}%
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
                      <div className="font-display text-lg font-bold" style={{ color: subject.color }}>
                        {subject.target}%
                      </div>
                    </div>
                    <div className="rounded-xl bg-muted/40 p-2">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Gap
                      </div>
                      <div
                        className={`font-display text-lg font-bold ${
                          subjectGap > 0 ? "text-warning" : "text-success"
                        }`}
                      >
                        {subjectGap > 0 ? `+${subjectGap}` : subjectGap}
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
                      value={[subject.target]}
                      min={50}
                      max={100}
                      step={1}
                      onValueChange={(value) => handleTargetChange(subject.id, value[0])}
                    />
                    <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
                      <span>50%</span>
                      <span>Predicted: {subject.predicted}%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-muted-foreground">
                    {subjectGap <= 0
                      ? `✨ You're on track. Lock it in by maintaining ${subject.predicted}%+ in mocks.`
                      : subjectGap <= 5
                        ? `Small push: focus on ${subject.weakTopics[0] ?? "weak areas"} to close the gap.`
                        : subjectGap <= 10
                          ? `Stretch goal: weekly mock + revise ${subject.weakTopics.slice(0, 2).join(", ")}.`
                          : `Aggressive: needs a 6-week intensive plan on ${subject.weakTopics.join(", ")}.`}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
