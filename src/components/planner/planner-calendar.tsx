/**
 * Lightweight academic + life calendar that plugs into the existing Study
 * Planner page. Uses the planner-events store + existing UI primitives —
 * no new heavy calendar dependency. Renders Day / Week / Month / Past tabs
 * plus intelligent insight strips (Upcoming Exams, Smart Revision,
 * Weak Topic Alerts, Daily Balance, Busy Days, Recommended Windows).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  CalendarDays,
  Plus,
  Trash2,
  Sparkles,
  AlertCircle,
  Clock,
  Scale,
  CalendarRange,
  History,
} from "lucide-react";
import { toast } from "sonner";
import {
  EVENT_CATEGORIES,
  addDays,
  addEvent,
  endOfMonth,
  getCategory,
  listEvents,
  removeEvent,
  startOfMonth,
  startOfWeek,
  toDateKey,
  subscribeEvents,
  type PlannerEvent,
  type PlannerEventCategory,
} from "@/lib/planner-events-store";
import { subjects } from "@/lib/mock-data";
import { canonicalSubjectRouteId } from "@/lib/chapter-routes";

const TONE_CLASS: Record<string, string> = {
  brand: "bg-brand/10 text-brand border-brand/30",
  success: "bg-success/10 text-success border-success/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  destructive: "bg-destructive/10 text-destructive border-destructive/30",
  muted: "bg-muted text-muted-foreground border-border/60",
};

function friendlyDate(key: string): string {
  const d = new Date(key + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function EventRow({
  evt,
  onDelete,
  showDate,
}: {
  evt: PlannerEvent;
  onDelete: () => void;
  showDate?: boolean;
}) {
  const cat = getCategory(evt.category);
  return (
    <div className="group flex items-center gap-3 rounded-2xl border border-border/60 bg-background/40 p-3 transition hover:border-brand/40">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-base ${TONE_CLASS[cat.tone]}`}
      >
        {cat.emoji}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{evt.title}</div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {showDate && <span>{friendlyDate(evt.date)}</span>}
          {showDate && (evt.time || evt.subject) && <span>·</span>}
          {evt.time && <span>{evt.time}</span>}
          {evt.subject && (
            <>
              {evt.time && <span>·</span>}
              <span>{evt.subject}</span>
            </>
          )}
          {evt.durationMin && (
            <>
              <span>·</span>
              <span>{evt.durationMin}m</span>
            </>
          )}
        </div>
      </div>
      <Badge variant="outline" className="rounded-full text-[10px]">
        {cat.label}
      </Badge>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 opacity-0 transition group-hover:opacity-100"
        onClick={onDelete}
        aria-label="Remove event"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
      {message}
    </div>
  );
}

export function PlannerCalendar() {
  const [events, setEvents] = useState<PlannerEvent[]>([]);
  const [tab, setTab] = useState<"day" | "week" | "month" | "past">("day");
  const [hydrated, setHydrated] = useState(false);

  // Quick-add form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<PlannerEventCategory>("study");
  const [date, setDate] = useState(toDateKey(new Date()));
  const [time, setTime] = useState("");
  const [subject, setSubject] = useState("");
  const quickAddRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEvents(listEvents());
    setHydrated(true);
  }, []);

  // Live-refresh whenever any other surface (planner tasks, prep modes,
  // recommendation cards) writes to the events store.
  useEffect(() => {
    const unsub = subscribeEvents(() => setEvents(listEvents()));
    return unsub;
  }, []);

  function refresh() {
    setEvents(listEvents());
  }

  function handleAdd() {
    if (!title.trim() || !date) {
      toast("Add a title and date first");
      return;
    }
    addEvent({
      title: title.trim(),
      category,
      date,
      time: time || undefined,
      subject: subject || undefined,
    });
    setTitle("");
    setTime("");
    refresh();
    toast.success("Event added", { description: `${title} · ${friendlyDate(date)}` });
  }

  function handleDelete(id: string) {
    removeEvent(id);
    refresh();
  }

  const todayKey = toDateKey(new Date());

  const grouped = useMemo(() => {
    const todayList = events.filter((e) => e.date === todayKey);
    const weekStart = startOfWeek(new Date());
    const weekEnd = addDays(weekStart, 6);
    const weekStartKey = toDateKey(weekStart);
    const weekEndKey = toDateKey(weekEnd);
    const weekList = events.filter(
      (e) => e.date >= weekStartKey && e.date <= weekEndKey,
    );
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    const monthList = events.filter(
      (e) => e.date >= toDateKey(monthStart) && e.date <= toDateKey(monthEnd),
    );
    const past = events.filter((e) => e.date < todayKey).reverse();
    return { todayList, weekList, monthList, past };
  }, [events, todayKey]);

  // ----- Intelligent strips -----
  const upcomingExams = useMemo(
    () =>
      events
        .filter((e) => e.category === "mock-exam" && e.date >= todayKey)
        .slice(0, 3),
    [events, todayKey],
  );

  const busyDays = useMemo(() => {
    const byDay = new Map<string, number>();
    grouped.weekList.forEach((e) => {
      byDay.set(e.date, (byDay.get(e.date) ?? 0) + 1);
    });
    return Array.from(byDay.entries())
      .filter(([, n]) => n >= 3)
      .map(([d, n]) => ({ date: d, count: n }));
  }, [grouped.weekList]);

  const weakAlerts = useMemo(
    () =>
      subjects
        .filter((s) => s.weakTopics.length > 0)
        .slice(0, 3)
        .map((s) => ({ subject: s.name, topic: s.weakTopics[0], emoji: s.emoji })),
    [],
  );

  const revisionSuggestions = useMemo(() => {
    // Suggest revision the day before an upcoming exam if not already scheduled.
    const suggestions: { subject: string; date: string; reason: string }[] = [];
    upcomingExams.forEach((ex) => {
      const day = new Date(ex.date + "T00:00:00");
      const dayBefore = toDateKey(addDays(day, -1));
      const already = events.some(
        (e) => e.date === dayBefore && e.category === "revision" && e.subject === ex.subject,
      );
      if (!already && dayBefore >= todayKey) {
        suggestions.push({
          subject: ex.subject ?? ex.title,
          date: dayBefore,
          reason: `Revise day before ${ex.title}`,
        });
      }
    });
    return suggestions.slice(0, 3);
  }, [upcomingExams, events, todayKey]);

  const dailyBalance = useMemo(() => {
    const t = grouped.todayList;
    const study = t.filter((e) => ["study", "revision", "mock-exam"].includes(e.category)).length;
    const life = t.filter((e) =>
      ["break", "sports", "festival", "personal"].includes(e.category),
    ).length;
    const school = t.filter((e) => ["school", "tuition"].includes(e.category)).length;
    return { study, life, school, total: t.length };
  }, [grouped.todayList]);

  const recommendedWindow = useMemo(() => {
    // Find next 3 days with the least scheduled events.
    const days: { date: string; count: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const k = toDateKey(addDays(new Date(), i));
      days.push({
        date: k,
        count: events.filter((e) => e.date === k).length,
      });
    }
    return days.sort((a, b) => a.count - b.count).slice(0, 3);
  }, [events]);

  function scheduleSuggestion(s: { subject: string; date: string; reason: string }) {
    addEvent({
      title: `Revise — ${s.subject}`,
      category: "revision",
      date: s.date,
      subject: s.subject,
    });
    refresh();
    toast.success("Added to calendar", { description: s.reason });
  }

  if (!hydrated) return null;

  return (
    <section className="min-w-0 rounded-3xl border border-border/60 bg-card p-4 shadow-card sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-lg font-semibold flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-brand" /> Calendar & Life Planner
        </h3>
        <Badge variant="outline" className="rounded-full">
          {events.length} event{events.length === 1 ? "" : "s"}
        </Badge>
      </div>

      {/* Intelligent strips */}
      <div className="mb-5 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <InsightCard
          icon={<CalendarRange className="h-4 w-4" />}
          title="Upcoming Exams"
          tone="warning"
          empty={upcomingExams.length === 0 ? "No mock exams scheduled" : undefined}
        >
          {upcomingExams.map((e) => (
            <li key={e.id}>
              <Link
                to="/exams"
                className="flex items-center justify-between gap-2 rounded-lg px-1 py-0.5 transition hover:bg-background/40"
              >
                <span className="truncate">{e.title}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {friendlyDate(e.date)}
                </span>
              </Link>
            </li>
          ))}
        </InsightCard>

        <InsightCard
          icon={<Sparkles className="h-4 w-4" />}
          title="Smart Revision"
          tone="brand"
          empty={revisionSuggestions.length === 0 ? "You're on track — no revisions to add" : undefined}
        >
          {revisionSuggestions.map((s, i) => (
            <li key={i} className="flex items-center justify-between gap-2">
              <span className="truncate">{s.subject}</span>
              <button
                onClick={() => scheduleSuggestion(s)}
                className="shrink-0 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-medium text-brand hover:bg-brand/20"
              >
                + {friendlyDate(s.date)}
              </button>
            </li>
          ))}
        </InsightCard>

        <InsightCard
          icon={<AlertCircle className="h-4 w-4" />}
          title="Weak Topic Alerts"
          tone="destructive"
          empty={weakAlerts.length === 0 ? "No weak topics flagged" : undefined}
        >
          {weakAlerts.map((w, i) => {
            const subj = subjects.find((s) => s.name === w.subject);
            const subjectId = canonicalSubjectRouteId(subj?.id ?? "math");
            return (
              <li key={i}>
                <Link
                  to="/subjects/$subjectId"
                  params={{ subjectId }}
                  className="flex items-center gap-2 rounded-lg px-1 py-0.5 transition hover:bg-background/40"
                >
                  <span>{w.emoji}</span>
                  <span className="truncate">
                    <span className="font-medium">{w.subject}:</span>{" "}
                    <span className="text-muted-foreground">{w.topic}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </InsightCard>

        <InsightCard
          icon={<Scale className="h-4 w-4" />}
          title="Daily Balance"
          tone="success"
          empty={dailyBalance.total === 0 ? "Add events to see today's balance" : undefined}
        >
          {dailyBalance.total > 0 && (
            <>
              <li>📚 Study: {dailyBalance.study}</li>
              <li>🏫 School/Tuition: {dailyBalance.school}</li>
              <li>💛 Life & Break: {dailyBalance.life}</li>
              <li className="text-[10px] italic text-muted-foreground">
                {dailyBalance.life === 0 && dailyBalance.study > 0
                  ? "Add a short break — pace yourself."
                  : dailyBalance.study === 0
                    ? "Even a 25-min study block helps today."
                    : "Nice balance — keep going."}
              </li>
            </>
          )}
        </InsightCard>

        <InsightCard
          icon={<CalendarRange className="h-4 w-4" />}
          title="Upcoming Busy Days"
          tone="warning"
          empty={busyDays.length === 0 ? "Your week looks manageable" : undefined}
        >
          {busyDays.map((b) => (
            <li key={b.date}>
              <button
                type="button"
                onClick={() => {
                  setDate(b.date);
                  setTab("day");
                  quickAddRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                  toast("Showing events for " + friendlyDate(b.date));
                }}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-0.5 text-left transition hover:bg-background/40"
              >
                <span>{friendlyDate(b.date)}</span>
                <span className="text-[10px] text-muted-foreground">{b.count} events</span>
              </button>
            </li>
          ))}
        </InsightCard>

        <InsightCard
          icon={<Clock className="h-4 w-4" />}
          title="Recommended Study Windows"
          tone="brand"
        >
          {recommendedWindow.map((w) => (
            <li key={w.date} className="flex items-center justify-between gap-2">
              <span>{friendlyDate(w.date)}</span>
              <button
                type="button"
                onClick={() => {
                  setDate(w.date);
                  setCategory("study");
                  setTab("day");
                  quickAddRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                  toast("Ready to schedule — fill in the title below");
                }}
                className="shrink-0 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-medium text-brand hover:bg-brand/20"
              >
                {w.count === 0 ? "Free" : `${w.count} busy`}
              </button>
            </li>
          ))}
        </InsightCard>
      </div>

      {/* Quick add */}
      <div ref={quickAddRef} className="mb-4 min-w-0 rounded-2xl border border-border/60 bg-background/40 p-3">
        <div className="grid gap-2 sm:grid-cols-[1fr_140px_140px_120px_auto]">
          <Input
            placeholder="Event — e.g. Mock Exam, Sports practice"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <select
            className="rounded-md border border-input bg-background px-3 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value as PlannerEventCategory)}
          >
            {EVENT_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.label}
              </option>
            ))}
          </select>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          <Button onClick={handleAdd} className="rounded-full">
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </div>
        <div className="mt-2">
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs sm:max-w-xs"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          >
            <option value="">No subject</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.name}>
                {s.emoji} {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Day/Week/Month/Past tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="day">Today</TabsTrigger>
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="month">This Month</TabsTrigger>
          <TabsTrigger value="past" className="gap-1">
            <History className="h-3 w-3" /> Past
          </TabsTrigger>
        </TabsList>

        <TabsContent value="day" className="mt-4 space-y-2">
          {grouped.todayList.length === 0 ? (
            <EmptyState message="Nothing on the calendar today. Schedule something above." />
          ) : (
            grouped.todayList.map((e) => (
              <EventRow key={e.id} evt={e} onDelete={() => handleDelete(e.id)} />
            ))
          )}
        </TabsContent>

        <TabsContent value="week" className="mt-4 space-y-2">
          {grouped.weekList.length === 0 ? (
            <EmptyState message="Nothing planned this week yet." />
          ) : (
            grouped.weekList.map((e) => (
              <EventRow key={e.id} evt={e} showDate onDelete={() => handleDelete(e.id)} />
            ))
          )}
        </TabsContent>

        <TabsContent value="month" className="mt-4 space-y-2">
          {grouped.monthList.length === 0 ? (
            <EmptyState message="No events this month. Add a mock exam or festival to start." />
          ) : (
            grouped.monthList.map((e) => (
              <EventRow key={e.id} evt={e} showDate onDelete={() => handleDelete(e.id)} />
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-4 space-y-2">
          {grouped.past.length === 0 ? (
            <EmptyState message="No past activity yet — your story starts here." />
          ) : (
            grouped.past
              .slice(0, 25)
              .map((e) => (
                <EventRow key={e.id} evt={e} showDate onDelete={() => handleDelete(e.id)} />
              ))
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}

function InsightCard({
  icon,
  title,
  tone,
  empty,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  tone: "brand" | "success" | "warning" | "destructive";
  empty?: string;
  children?: React.ReactNode;
}) {
  const toneCls = TONE_CLASS[tone];
  return (
    <div className={`rounded-2xl border p-3 ${toneCls}`}>
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
        {icon}
        <span>{title}</span>
      </div>
      {empty ? (
        <p className="text-[11px] opacity-80">{empty}</p>
      ) : (
        <ul className="space-y-1 text-[11px] [&>li]:leading-snug">{children}</ul>
      )}
    </div>
  );
}