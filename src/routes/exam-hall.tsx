import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Clock, GraduationCap, Play, ShieldCheck, Sparkles, Timer } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { useExamHall, useExamHallList } from "@/hooks/use-exam-hall";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/exam-hall")({
  head: () => ({
    meta: [
      { title: "Exam Hall — Aura Board Simulation" },
      {
        name: "description",
        content:
          "Full SSLC board exam simulation with AI invigilator, strict timing, presentation analysis and post-exam intelligence.",
      },
      { property: "og:title", content: "Exam Hall — Aura Board Simulation" },
      {
        property: "og:description",
        content:
          "Practise like the real board day. AI invigilator, strict timing, and a calm exam-mode interface.",
      },
    ],
  }),
  component: ExamHallIndex,
});

function ExamHallIndex() {
  const navigate = useNavigate();
  const { startSession } = useExamHall();
  const list = useExamHallList();

  const handleStart = async () => {
    const s = await startSession();
    navigate({ to: "/exam-hall/$sessionId", params: { sessionId: s.id } });
  };

  return (
    <DashboardLayout title="Exam Hall">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="rounded-3xl border border-border/60 bg-card p-6 md:p-8">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
            <GraduationCap className="h-3.5 w-3.5" />
            Board Exam Mode
          </div>
          <h1 className="mt-2 font-display text-2xl md:text-3xl font-bold tracking-tight">
            Step into a real SSLC exam hall.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Distraction-free interface, strict section timers, AI invigilator and a
            detailed post-exam breakdown — predicted marks, weak areas, presentation
            and stress pattern.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Feature icon={Timer} title="Strict timing" body="Section + total timers, auto-submit when time ends." />
            <Feature icon={Sparkles} title="AI invigilator" body="Detects panic, slow solving, fatigue." />
            <Feature icon={ShieldCheck} title="Anti-cheat" body="Tracks blur, paste and fullscreen exits." />
          </div>
          <Button className="mt-6 w-full rounded-full gap-2" onClick={handleStart}>
            <Play className="h-4 w-4" />
            Start full board simulation
          </Button>
        </section>

        {list.length > 0 && (
          <section className="rounded-3xl border border-border/60 bg-card p-5 md:p-6">
            <h3 className="font-display text-lg font-semibold">Recent hall sessions</h3>
            <div className="mt-3 divide-y divide-border/60">
              {list.slice(0, 6).map((s) => (
                <Link
                  key={s.id}
                  to="/exam-hall/$sessionId"
                  params={{ sessionId: s.id }}
                  className="flex items-center justify-between gap-3 py-3 text-sm hover:bg-secondary/40 -mx-2 px-2 rounded-lg"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{s.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(s.startedAt).toLocaleString()} ·{" "}
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5",
                          s.status === "submitted" || s.status === "auto_submitted"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-amber-500/10 text-amber-600",
                        )}
                      >
                        {s.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <div className="flex items-center justify-end gap-1">
                      <Clock className="h-3 w-3" />
                      {Math.round(s.elapsedSec / 60)}m
                    </div>
                    <div>{s.totalMarks} marks</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Timer;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div className="mt-2 text-sm font-semibold">{title}</div>
      <div className="text-xs text-muted-foreground">{body}</div>
    </div>
  );
}