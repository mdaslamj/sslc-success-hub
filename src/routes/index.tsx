import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Flame,
  ArrowRight,
  Quote,
  Sparkles,
  Brain,
  CalendarDays,
  TrendingUp,
  Sun,
  Moon,
  Sunrise,
  Wand2,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ProgressRing } from "@/components/widgets/progress-ring";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import {
  subjects,
  motivationalQuotes,
  getDaysToExam,
  overallPrepScore,
  predictedPercentage,
  targetPercentage,
  studyStreak,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "@tanstack/react-router";
import { useDailyEngine } from "@/hooks/use-daily-engine";
import { TaskRow } from "@/components/daily/task-row";
import { ReflectionSheet } from "@/components/daily/reflection-sheet";
import { useGamification } from "@/hooks/use-gamification";
import { DailyMissionsCard } from "@/components/gamification/daily-missions-card";
import { JourneyStrip } from "@/components/gamification/journey-strip";

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
  const navigate = useNavigate();
  const firstName = (profile?.studentName || profile?.displayName || user?.displayName || "friend")
    .split(" ")[0];

  const [quote, setQuote] = useState(motivationalQuotes[0]);
  const [greet, setGreet] = useState<{ label: string; icon: React.ReactNode }>({
    label: "day",
    icon: <Sun className="h-3.5 w-3.5" />,
  });
  const [reflectionOpen, setReflectionOpen] = useState(false);

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreet({ label: "morning", icon: <Sunrise className="h-3.5 w-3.5" /> });
    else if (h < 17) setGreet({ label: "afternoon", icon: <Sun className="h-3.5 w-3.5" /> });
    else setGreet({ label: "evening", icon: <Moon className="h-3.5 w-3.5" /> });
    setQuote(motivationalQuotes[new Date().getDate() % motivationalQuotes.length]);
  }, []);

  const days = getDaysToExam();
  const weakSubjects = useMemo(
    () => [...subjects].sort((a, b) => a.mastery - b.mastery),
    [],
  );

  const engine = useDailyEngine({
    dailyGoalMinutes: profile?.dailyStudyGoalMinutes ?? 60,
    daysToExam: days,
    weakSubjects: weakSubjects.slice(0, 3).map((s) => ({
      id: s.id,
      name: s.name,
      mastery: s.mastery,
      weakTopic: s.weakTopics?.[0],
    })),
    revisionCandidates: weakSubjects.slice(0, 4).map((s, i) => ({
      id: `${s.id}_${i}`,
      subject: s.name,
      subjectId: s.id,
      chapterId: `${s.id}-ch-${i}`,
      chapterTitle: s.weakTopics?.[0] ?? `${s.name} core revision`,
      priority: 80 - i * 10,
      confidenceDecay: 0.5 - i * 0.1,
      marksAtRisk: 6 - i,
    })),
    formulaTargets:
      weakSubjects[0]?.id === "math"
        ? [{ chapterId: "math-formulas", subject: "Mathematics", title: "Algebra essentials" }]
        : undefined,
  });

  const gamification = useGamification({
    dailyGoalMinutes: profile?.dailyStudyGoalMinutes ?? 60,
    daysToExam: days,
    weakSubjects: weakSubjects.slice(0, 3).map((s) => ({
      id: s.id,
      name: s.name,
      mastery: s.mastery,
    })),
    revisionDue: 3,
  });

  const focus = engine.plan?.tasks.find((t) => !t.done) ?? engine.plan?.tasks[0];
  const todayPct = engine.completion;

  const weekDots = Array.from({ length: 7 }).map((_, i) => {
    const idx = (new Date().getDay() + i) % 7;
    const active = i < Math.min(7, studyStreak);
    return { label: "MTWTFSS"[idx], active };
  });

  return (
    <DashboardLayout title="Today">
      <div className="mx-auto max-w-md space-y-5 md:max-w-2xl">
        <section className="pt-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-primary">
            {greet.icon}
            Good {greet.label}
          </div>
          <h1 className="mt-2 font-display text-[28px] font-bold leading-tight tracking-tight text-foreground">
            Hi {firstName} 🌱
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{engine.motivation}</p>
          {user && (
            <button
              onClick={() => void engine.requestAiCoach()}
              className="press mt-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary"
            >
              <Wand2 className="h-3 w-3" /> Refresh AI coach
            </button>
          )}
        </section>

        {focus && (
          <FocusCard
            subject={focus.subject ?? "Today"}
            task={focus.title}
            time={`${focus.durationMin} min`}
            done={!!focus.done}
            onToggle={() => void engine.toggleTask(focus.id)}
            onStart={() => navigate({ to: "/session", search: { taskId: focus.id } })}
            progress={todayPct}
            hint={engine.aiPriorityHint ?? focus.reason}
          />
        )}

        <section>
          <SectionHeader
            title="Today's plan"
            hint={engine.plan ? `${todayPct}% · ${engine.totalMinutes}m` : ""}
          />
          <div className="mt-3 space-y-2">
            {engine.loading || !engine.plan ? (
              <div className="rounded-2xl bg-card p-4 text-sm text-muted-foreground shadow-soft">
                Generating your daily plan…
              </div>
            ) : (
              engine.plan.tasks.map((t) => (
                <TaskRow
                  key={t.id}
                  task={t}
                  active={engine.activeTaskId === t.id}
                  onToggle={() => {
                    if (t.kind === "reflection" && !t.done) setReflectionOpen(true);
                    else void engine.toggleTask(t.id);
                  }}
                  onStart={t.kind === "reflection" ? undefined : () => undefined}
                />
              ))
            )}
          </div>
        </section>

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

        <JourneyStrip
          tier={gamification.journey}
          progress={gamification.journeyProgress}
          totalXp={gamification.totalXp}
          level={gamification.level.level}
        />

        {gamification.todaysMissions.length > 0 && (
          <DailyMissionsCard missions={gamification.todaysMissions} />
        )}

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

        <section className="grid grid-cols-2 gap-3">
          <MiniStat icon={<CalendarDays className="h-4 w-4" />} label="Exam in" value={`${days}d`} />
          <MiniStat icon={<Sparkles className="h-4 w-4" />} label="Prep score" value={`${overallPrepScore}`} />
        </section>
        <div className="h-24" />
      </div>

      <ReflectionSheet
        open={reflectionOpen}
        onClose={() => setReflectionOpen(false)}
        defaultMinutes={
          engine.plan?.tasks.filter((t) => t.done).reduce((s, t) => s + t.durationMin, 0) ?? 0
        }
        onSubmit={async (input) => {
          await engine.saveReflection({
            confidence: input.confidence,
            difficult: input.difficult,
            studyMinutes: input.studyMinutes,
          });
          const reflTask = engine.plan?.tasks.find((t) => t.kind === "reflection" && !t.done);
          if (reflTask) await engine.toggleTask(reflTask.id);
          setReflectionOpen(false);
        }}
      />
    </DashboardLayout>
  );
}

function FocusCard({
  subject,
  task,
  time,
  done,
  onToggle,
  onStart,
  progress,
  hint,
}: {
  subject: string;
  task: string;
  time: string;
  done: boolean;
  onToggle: () => void;
  onStart?: () => void;
  progress: number;
  hint?: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-brand-glow p-5 text-primary-foreground shadow-soft">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
      <div className="relative">
        <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-primary-foreground/80">
          <Sparkles className="h-3.5 w-3.5" /> Today's focus
        </div>
        <h2 className="mt-2 font-display text-[22px] font-bold leading-tight">{task}</h2>
        <div className="mt-1 text-xs text-primary-foreground/80">
          {subject} · {time}
        </div>
        {hint && (
          <div className="mt-2 rounded-2xl bg-white/15 px-3 py-2 text-[11px] leading-snug text-primary-foreground/95">
            {hint}
          </div>
        )}
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            onClick={done ? onToggle : (onStart ?? onToggle)}
            className="press inline-flex items-center gap-2 rounded-2xl bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-soft"
          >
            {done ? "Marked done ✓" : (
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