import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Flame,
  ArrowRight,
  CheckCircle2,
  Circle,
  Quote,
  Sparkles,
  Brain,
  CalendarDays,
  AlertTriangle,
  TrendingUp,
  ChevronRight,
  Sun,
  Moon,
  Sunrise,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ProgressRing } from "@/components/widgets/progress-ring";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import {
  subjects,
  motivationalQuotes,
  todayTasks,
  getDaysToExam,
  overallPrepScore,
  predictedPercentage,
  targetPercentage,
  studyStreak,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today — Project Aura" },
      {
        name: "description",
        content:
          "Your calm daily study companion — one focus, gentle reminders, and an honest readiness check.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { user, profile } = useAuth();
  const firstName = (profile?.studentName || profile?.displayName || user?.displayName || "friend")
    .split(" ")[0];

  const [tasks, setTasks] = useState(todayTasks);
  const [quote, setQuote] = useState(motivationalQuotes[0]);
  const [greet, setGreet] = useState<{ label: string; icon: React.ReactNode }>({
    label: "day",
    icon: <Sun className="h-3.5 w-3.5" />,
  });

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreet({ label: "morning", icon: <Sunrise className="h-3.5 w-3.5" /> });
    else if (h < 17) setGreet({ label: "afternoon", icon: <Sun className="h-3.5 w-3.5" /> });
    else setGreet({ label: "evening", icon: <Moon className="h-3.5 w-3.5" /> });
    setQuote(motivationalQuotes[new Date().getDate() % motivationalQuotes.length]);
  }, []);

  const days = getDaysToExam();
  const focus = tasks.find((t) => !t.done) ?? tasks[0];
  const weakSubjects = useMemo(
    () => [...subjects].sort((a, b) => a.mastery - b.mastery).slice(0, 2),
    [],
  );

  const todayDone = tasks.filter((t) => t.done).length;
  const todayPct = Math.round((todayDone / tasks.length) * 100);

  // Last 7 days streak dots — synthetic for now (last `studyStreak % 7` active)
  const weekDots = Array.from({ length: 7 }).map((_, i) => {
    const idx = (new Date().getDay() + i) % 7;
    const active = i < Math.min(7, studyStreak);
    return { label: "MTWTFSS"[idx], active };
  });

  return (
    <DashboardLayout title="Today">
      <div className="mx-auto max-w-md space-y-5 md:max-w-2xl">
        {/* Calm greeting */}
        <section className="pt-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-primary">
            {greet.icon}
            Good {greet.label}
          </div>
          <h1 className="mt-2 font-display text-[28px] font-bold leading-tight tracking-tight text-foreground">
            Hi {firstName} 🌱
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One small step today keeps your plan alive.
          </p>
        </section>

        {/* Today's focus — hero card */}
        <FocusCard
          subject={focus.subject}
          task={focus.task}
          time={focus.time}
          done={focus.done}
          onToggle={() =>
            setTasks((p) => p.map((x) => (x.id === focus.id ? { ...x, done: !x.done } : x)))
          }
          progress={todayPct}
        />

        {/* Streak strip */}
        <section className="rounded-3xl bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                <Flame className="h-3.5 w-3.5 text-warning" /> Streak
              </div>
              <div className="mt-1 font-display text-2xl font-bold">{studyStreak} days</div>
            </div>
            <Quote className="h-5 w-5 text-primary/60" />
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1.5">
            {weekDots.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span
                  className={cn(
                    "h-7 w-7 rounded-full transition-colors",
                    d.active ? "bg-primary" : "bg-secondary",
                  )}
                />
                <span className="text-[10px] text-muted-foreground">{d.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm italic text-foreground/70">
            "{quote.text}" <span className="text-muted-foreground">— {quote.author}</span>
          </p>
        </section>

        {/* Revision reminders */}
        <section>
          <SectionHeader title="Revision reminders" hint={`${tasks.length - todayDone} due`} />
          <div className="mt-3 space-y-2">
            {tasks.map((t) => (
              <button
                key={t.id}
                onClick={() =>
                  setTasks((p) => p.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))
                }
                className="press flex w-full items-center gap-3 rounded-2xl bg-card p-3.5 text-left shadow-soft"
              >
                {t.done ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      "text-sm font-medium",
                      t.done ? "text-muted-foreground line-through" : "text-foreground",
                    )}
                  >
                    {t.task}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {t.subject} · {t.time}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </section>

        {/* Weak-topic interventions */}
        <section>
          <SectionHeader title="Gentle interventions" hint="From your weak topics" />
          <div className="mt-3 space-y-2">
            {weakSubjects.map((s) => (
              <Link
                key={s.id}
                to="/subjects/$subjectId"
                params={{ subjectId: s.id }}
                className="press flex items-center gap-3 rounded-2xl bg-card p-4 shadow-soft"
              >
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-2xl text-lg"
                  style={{
                    background: `color-mix(in oklab, ${s.color} 18%, transparent)`,
                    color: s.color,
                  }}
                >
                  {s.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-display text-base font-semibold">{s.name}</div>
                    <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Mastery {s.mastery}% · {s.weakTopics?.[0] ?? "Try a quick recap"}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </section>

        {/* Board readiness */}
        <section className="rounded-3xl bg-card p-5 shadow-soft">
          <div className="flex items-center gap-4">
            <ProgressRing value={overallPrepScore} size={84} stroke={8} sublabel="ready" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                <Brain className="h-3.5 w-3.5" /> Board readiness
              </div>
              <div className="mt-1 font-display text-xl font-bold">
                You're tracking for {predictedPercentage}%
              </div>
              <div className="text-xs text-muted-foreground">
                Target {targetPercentage}% · {days} days to exam
              </div>
              <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-success">
                <TrendingUp className="h-3.5 w-3.5" /> +4 pts this week
              </div>
            </div>
          </div>
          <Button asChild className="press mt-4 h-11 w-full rounded-2xl text-sm font-semibold">
            <Link to="/predictions">
              See full prediction <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </section>

        {/* Quick stat strip */}
        <section className="grid grid-cols-2 gap-3">
          <MiniStat icon={<CalendarDays className="h-4 w-4" />} label="Exam in" value={`${days}d`} />
          <MiniStat icon={<Sparkles className="h-4 w-4" />} label="Prep score" value={`${overallPrepScore}`} />
        </section>
      </div>
    </DashboardLayout>
  );
}

function FocusCard({
  subject,
  task,
  time,
  done,
  onToggle,
  progress,
}: {
  subject: string;
  task: string;
  time: string;
  done: boolean;
  onToggle: () => void;
  progress: number;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-brand-glow p-5 text-primary-foreground shadow-soft">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
      <div className="relative">
        <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-primary-foreground/80">
          <Sparkles className="h-3.5 w-3.5" /> Today's focus
        </div>
        <h2 className="mt-2 font-display text-[22px] font-bold leading-tight">
          {task}
        </h2>
        <div className="mt-1 text-xs text-primary-foreground/80">
          {subject} · {time}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            onClick={onToggle}
            className="press inline-flex items-center gap-2 rounded-2xl bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-soft"
          >
            {done ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-success" /> Done
              </>
            ) : (
              <>
                Start session <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
          <div className="text-right">
            <div className="font-display text-lg font-bold leading-none">{progress}%</div>
            <div className="text-[10px] uppercase tracking-wider text-primary-foreground/80">today</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-end justify-between px-1">
      <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-soft">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
    </div>
  );
}
