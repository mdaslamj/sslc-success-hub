import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Flame,
  Target,
  Brain,
  CalendarDays,
  TrendingUp,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Circle,
  Quote,
  Lightbulb,
  GraduationCap,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  CartesianGrid,
} from "recharts";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatCard } from "@/components/widgets/stat-card";
import { ProgressRing } from "@/components/widgets/progress-ring";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  subjects,
  weeklyStudy,
  monthlyProgress,
  motivationalQuotes,
  todayTasks,
  getDaysToExam,
  overallPrepScore,
  predictedPercentage,
  targetPercentage,
  gradeFor,
  heatmap,
  studyStreak,
} from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — VidyaPath SSLC Prep" },
      { name: "description", content: "Your daily AI-powered Karnataka SSLC preparation dashboard." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const days = getDaysToExam();
  const quote = useMemo(
    () => motivationalQuotes[new Date().getDate() % motivationalQuotes.length],
    [],
  );
  const [tasks, setTasks] = useState(todayTasks);
  const doneCount = tasks.filter((t) => t.done).length;

  const radialData = subjects.map((s) => ({
    name: s.name,
    value: s.mastery,
    fill: s.color,
  }));

  return (
    <DashboardLayout title="Dashboard">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl gradient-ocean p-6 md:p-8 text-white shadow-glow">
          <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-brand-glow/30 blur-3xl animate-float" />
          <div className="absolute right-20 bottom-0 h-40 w-40 rounded-full bg-info/30 blur-3xl" />
          <div className="relative grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-center">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/70">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Good {greeting()}, Aarav</span>
              </div>
              <h1 className="mt-2 font-display text-3xl md:text-4xl font-bold tracking-tight">
                You're <span className="text-brand-glow">{overallPrepScore}%</span> ready for SSLC.
                Keep the streak alive.
              </h1>
              <div className="mt-4 flex items-center gap-2 text-sm text-white/80">
                <Quote className="h-4 w-4 text-brand-glow shrink-0" />
                <p className="italic">"{quote.text}" — {quote.author}</p>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button className="rounded-full bg-white text-foreground hover:bg-white/90 shadow-lg">
                  Resume Today's Plan <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
                <Button asChild variant="outline" className="rounded-full border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                  <Link to="/predictions">View AI Prediction</Link>
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <HeroStat icon={<Flame className="h-4 w-4" />} label="Streak" value={`${studyStreak}d`} />
              <HeroStat icon={<CalendarDays className="h-4 w-4" />} label="Exam in" value={`${days}d`} />
              <HeroStat icon={<GraduationCap className="h-4 w-4" />} label="Grade" value={gradeFor(predictedPercentage)} />
            </div>
          </div>
        </section>

        {/* Stat cards */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="AI Prep Score"
            value={`${overallPrepScore}`}
            hint={<span className="text-success">▲ 4 pts this week</span>}
            icon={<Brain className="h-4 w-4" />}
            accent="brand"
          />
          <StatCard
            label="Predicted %"
            value={`${predictedPercentage}%`}
            hint={`Grade ${gradeFor(predictedPercentage)} · 87% confidence`}
            icon={<TrendingUp className="h-4 w-4" />}
            accent="info"
          />
          <StatCard
            label="Target %"
            value={`${targetPercentage}%`}
            hint={`Gap: ${targetPercentage - predictedPercentage} pts to close`}
            icon={<Target className="h-4 w-4" />}
            accent="warning"
          />
          <StatCard
            label="Study Streak"
            value={`${studyStreak} days`}
            hint="Longest: 18 days"
            icon={<Flame className="h-4 w-4" />}
            accent="success"
          />
        </section>

        {/* Charts row */}
        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card p-6 shadow-card">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold">Weekly Study Hours</h3>
                <p className="text-xs text-muted-foreground">Hours vs daily target</p>
              </div>
              <div className="text-right">
                <div className="font-display text-2xl font-bold gradient-text">37.3h</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">this week</div>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklyStudy}>
                  <defs>
                    <linearGradient id="ghours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Area type="monotone" dataKey="hours" stroke="var(--brand)" strokeWidth={2.5} fill="url(#ghours)" />
                  <Area type="monotone" dataKey="target" stroke="var(--brand-glow)" strokeDasharray="4 4" fillOpacity={0} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
            <h3 className="font-display text-lg font-semibold">Subject Readiness</h3>
            <p className="text-xs text-muted-foreground">Mastery score across all subjects</p>
            <div className="mt-2 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="30%" outerRadius="100%" data={radialData} startAngle={90} endAngle={-270}>
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar dataKey="value" cornerRadius={8} background={{ fill: "var(--muted)" }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              {subjects.map((s) => (
                <div key={s.id} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-muted-foreground truncate">{s.name}</span>
                  <span className="ml-auto font-semibold">{s.mastery}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tasks + Heatmap + Subjects */}
        <section className="grid gap-6 lg:grid-cols-3">
          {/* Today's tasks */}
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold">Today's Plan</h3>
                <p className="text-xs text-muted-foreground">{doneCount} of {tasks.length} completed</p>
              </div>
              <ProgressRing value={Math.round((doneCount / tasks.length) * 100)} size={64} stroke={6} sublabel="done" />
            </div>
            <div className="space-y-2">
              {tasks.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTasks((p) => p.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))}
                  className="flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-secondary/60"
                >
                  {t.done ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-success shrink-0" />
                  ) : (
                    <Circle className="mt-0.5 h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm font-medium ${t.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {t.task}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{t.subject} · {t.time}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Performance heatmap */}
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
            <h3 className="font-display text-lg font-semibold">Consistency Heatmap</h3>
            <p className="text-xs text-muted-foreground">Last 7 weeks of study activity</p>
            <div className="mt-5 grid grid-cols-7 gap-1.5">
              {heatmap.flat().map((v, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-md transition-transform hover:scale-110"
                  style={{
                    background:
                      v === 0
                        ? "var(--muted)"
                        : `color-mix(in oklab, var(--brand) ${v * 22}%, var(--muted))`,
                  }}
                  title={`${v} sessions`}
                />
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Less</span>
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((v) => (
                  <div
                    key={v}
                    className="h-2.5 w-2.5 rounded"
                    style={{
                      background:
                        v === 0
                          ? "var(--muted)"
                          : `color-mix(in oklab, var(--brand) ${v * 22}%, var(--muted))`,
                    }}
                  />
                ))}
              </div>
              <span>More</span>
            </div>
            <div className="mt-5 rounded-xl bg-secondary/60 p-3">
              <div className="flex items-start gap-2">
                <Lightbulb className="mt-0.5 h-4 w-4 text-warning shrink-0" />
                <p className="text-xs text-foreground/80">
                  <span className="font-semibold">AI tip:</span> Wednesdays are your weakest day. Try a 30-min revision sprint at 6 PM.
                </p>
              </div>
            </div>
          </div>

          {/* Monthly progress */}
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
            <div className="mb-2 flex items-start justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold">Progress Trend</h3>
                <p className="text-xs text-muted-foreground">6-month prep score</p>
              </div>
              <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">+24 pts</span>
            </div>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyProgress}>
                  <defs>
                    <linearGradient id="gmonth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--info)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--info)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                  <Area type="monotone" dataKey="score" stroke="var(--info)" strokeWidth={2.5} fill="url(#gmonth)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-secondary/60 py-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Tests</div>
                <div className="font-display text-base font-bold">42</div>
              </div>
              <div className="rounded-lg bg-secondary/60 py-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Accuracy</div>
                <div className="font-display text-base font-bold">81%</div>
              </div>
              <div className="rounded-lg bg-secondary/60 py-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Rank</div>
                <div className="font-display text-base font-bold">#4</div>
              </div>
            </div>
          </div>
        </section>

        {/* Subject readiness bars */}
        <section className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold">Subject-wise Readiness</h3>
              <p className="text-xs text-muted-foreground">Predicted vs target marks</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="gap-1">
              <Link to="/subjects">All subjects <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {subjects.map((s) => (
              <div key={s.id} className="rounded-xl border border-border/60 bg-background/60 p-4 transition-all hover:shadow-card">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold"
                    style={{ background: `color-mix(in oklab, ${s.color} 18%, transparent)`, color: s.color }}
                  >
                    {s.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="font-display font-semibold">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.chaptersDone}/{s.chapters} ch</div>
                    </div>
                    {s.nameKn && <div className="text-[11px] text-muted-foreground">{s.nameKn}</div>}
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Predicted</span>
                    <span className="font-semibold">{s.predicted}%</span>
                  </div>
                  <div className="relative h-2 rounded-full bg-muted">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ width: `${s.predicted}%`, background: `linear-gradient(90deg, ${s.color}, var(--brand-glow))` }}
                    />
                    <div
                      className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rounded bg-foreground"
                      style={{ left: `${s.target}%` }}
                      title={`Target: ${s.target}%`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Mastery {s.mastery}%</span>
                    <span>Target {s.target}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

function HeroStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="glass-dark rounded-2xl p-4 text-center">
      <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-brand-glow">
        {icon}
      </div>
      <div className="font-display text-xl font-bold text-white">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-white/60">{label}</div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}