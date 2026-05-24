import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Waves, Plus, CheckCircle2, Clock, Repeat } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAnalytics } from "@/hooks/use-analytics";
import { subjects } from "@/lib/mock-data";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/log")({
  head: () => ({
    meta: [
      { title: "Study log — Project Aura" },
      { name: "description", content: "Daily study log, consistency calendar, and revision-due overlays." },
    ],
  }),
  component: StudyLogPage,
});

function StudyLogPage() {
  const a = useAnalytics();
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "math");
  const [minutes, setMinutes] = useState(30);
  const [note, setNote] = useState("");

  const log = () => {
    a.logSession({
      kind: "chapter",
      subjectId,
      startedAt: Date.now() - minutes * 60_000,
      endedAt: Date.now(),
      durationMinutes: minutes,
      notes: note || undefined,
    });
    toast.success(`Logged ${minutes} min 🌱`);
    setNote("");
    a.refresh();
  };

  // Build last 35-day calendar with active day markers
  const cells = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 35 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (34 - i));
      const key = d.toISOString().slice(0, 10);
      const dayMin = a.weekly.find((w) => w.dayKey === key)?.minutes ?? 0;
      return { key, day: d.getDate(), min: dayMin, isToday: i === 34 };
    });
  }, [a.weekly]);

  return (
    <DashboardLayout title="Study log">
      <div className="mx-auto max-w-md space-y-5 md:max-w-2xl">
        {/* Consistency header */}
        <section className="rounded-3xl bg-card p-5 shadow-soft">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full gradient-brand text-brand-foreground shadow-soft">
              <Waves className="h-7 w-7" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Consistency</div>
              <div className="font-display text-3xl font-bold">
                {a.consistency.daysActiveLast14} of 14 days
              </div>
              <div className="text-xs text-muted-foreground">{a.consistency.message}</div>
            </div>
          </div>
        </section>

        {/* Calendar */}
        <section className="rounded-3xl bg-card p-5 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-base font-semibold">Last 5 weeks</h3>
            <span className="text-[11px] text-muted-foreground">Tap for revision</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((c) => (
              <div
                key={c.key}
                title={`${c.key} · ${c.min}m`}
                className={cn(
                  "press relative flex aspect-square flex-col items-center justify-center rounded-xl text-[10px]",
                  c.min > 0 ? "bg-primary/80 text-primary-foreground" : "bg-secondary text-muted-foreground",
                  c.isToday && "ring-2 ring-primary ring-offset-2 ring-offset-card",
                )}
              >
                <span className="font-semibold">{c.day}</span>
                {c.min === 0 && c.isToday && (
                  <span className="absolute -bottom-1 h-1.5 w-1.5 rounded-full bg-warning" />
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Less</span>
            <div className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded bg-secondary" />
              <span className="h-2.5 w-2.5 rounded bg-primary/40" />
              <span className="h-2.5 w-2.5 rounded bg-primary/70" />
              <span className="h-2.5 w-2.5 rounded bg-primary" />
            </div>
            <span>More</span>
          </div>
        </section>

        {/* Revision due overlay */}
        <section className="rounded-3xl bg-secondary p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-card">
              <Repeat className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-base font-semibold">Revision due today</h3>
              <p className="text-xs text-muted-foreground">
                {subjects.slice(0, 2).map((s) => s.name).join(" · ")} — quick recall, 10 min each.
              </p>
            </div>
          </div>
        </section>

        {/* Log entry */}
        <section className="rounded-3xl bg-card p-5 shadow-soft">
          <h3 className="font-display text-base font-semibold">Log today</h3>
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Subject</label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger className="mt-1 h-12 rounded-2xl bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.emoji} {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">Time studied</label>
                <span className="text-sm font-semibold">
                  <Clock className="mr-1 inline h-3.5 w-3.5" />
                  {minutes} min
                </span>
              </div>
              <Slider
                value={[minutes]}
                min={5}
                max={180}
                step={5}
                onValueChange={([v]) => setMinutes(v)}
                className="mt-3"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Note (optional)</label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Felt strong on quadratics today"
                className="mt-1 h-12 rounded-2xl bg-background"
              />
            </div>
            <Button
              onClick={log}
              className="press h-12 w-full rounded-2xl gradient-brand text-brand-foreground"
            >
              <Plus className="mr-1 h-4 w-4" /> Add to log
            </Button>
          </div>
        </section>

        {/* Recent */}
        <section>
          <h3 className="px-1 font-display text-base font-semibold">Recent sessions</h3>
          <div className="mt-3 space-y-2">
            {a.recentSessions.slice(0, 6).map((s) => {
              const sub = subjects.find((x) => x.id === s.subjectId);
              return (
                <div key={s.id} className="flex items-center gap-3 rounded-2xl bg-card p-3.5 shadow-soft">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-2xl text-base"
                    style={{
                      background: `color-mix(in oklab, ${sub?.color ?? "var(--primary)"} 18%, transparent)`,
                    }}
                  >
                    {sub?.emoji ?? "📚"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{sub?.name ?? "Study"}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {s.dayKey} · {s.durationMinutes} min · {s.kind}
                    </div>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </div>
              );
            })}
            {a.recentSessions.length === 0 && (
              <p className="rounded-2xl bg-card p-5 text-center text-sm text-muted-foreground shadow-soft">
                No sessions yet — log your first one above.
              </p>
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}