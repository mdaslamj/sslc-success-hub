import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Users,
  Bell,
  CalendarRange,
  LinkIcon,
  Copy,
  Check,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ParentSummaryView } from "@/components/parent/ParentSummaryView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  useParentDashboard,
  useStudentInviteCodes,
} from "@/hooks/use-parent-dashboard";
import { useParentSummaryView } from "@/hooks/useParentSummaryView";
import { ShareWithParentCard } from "@/components/parent/ShareWithParentCard";
import type { ParentAlertDoc, ParentAlertSeverity } from "@/integrations/firebase/types";

export const Route = createFileRoute("/parent")({
  head: () => ({
    meta: [
      { title: "Parent Dashboard — Aura" },
      {
        name: "description",
        content:
          "A calm, parent-friendly summary of your child's SSLC progress — no raw scores or anxiety metrics.",
      },
    ],
  }),
  component: ParentPage,
});

function ParentPage() {
  const d = useParentDashboard();
  const { summary, loading } = useParentSummaryView();
  const [tab, setTab] = useState("overview");

  return (
    <DashboardLayout title="Parent">
      <div className="mx-auto max-w-md space-y-4 md:max-w-2xl">
        <header className="pt-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-primary">
            <Users className="h-3.5 w-3.5" /> Parent view
          </div>
          <h1 className="mt-2 font-display text-[26px] font-bold tracking-tight">
            {summary?.studentName
              ? `${summary.studentName.split(" ")[0]}'s progress`
              : "Your child's calm progress"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Supportive language only — no raw scores, probabilities, or anxiety data.
          </p>
        </header>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 rounded-2xl">
            <TabsTrigger value="overview" className="text-xs">
              Summary
            </TabsTrigger>
            <TabsTrigger value="alerts" className="text-xs">
              Alerts{" "}
              {d.unreadAlerts > 0 && (
                <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                  {d.unreadAlerts}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="weekly" className="text-xs">
              Weekly
            </TabsTrigger>
            <TabsTrigger value="connect" className="text-xs">
              Connect
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-3">
            {!d.activeStudent && d.linkedStudents.length === 0 ? (
              <EmptyConnect onGo={() => setTab("connect")} />
            ) : loading || !summary ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ParentSummaryView summary={summary} />
            )}
          </TabsContent>

          <TabsContent value="alerts" className="mt-4 space-y-3">
            {!d.activeStudent ? (
              <EmptyConnect onGo={() => setTab("connect")} />
            ) : (
              <>
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {d.alerts.length} insights
                  </span>
                  <button
                    onClick={() => void d.regenerateAlerts()}
                    className="press inline-flex items-center gap-1 text-[11px] font-medium text-primary"
                  >
                    <RefreshCw className="h-3 w-3" /> Refresh
                  </button>
                </div>
                {d.alerts.length === 0 ? (
                  <div className="rounded-2xl bg-card p-4 text-sm text-muted-foreground shadow-soft">
                    All quiet — no alerts today. That&apos;s a good thing.
                  </div>
                ) : (
                  d.alerts.map((a) => (
                    <AlertCard key={a.id} alert={a} onMarkRead={() => void d.markAlertRead(a.id)} />
                  ))
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="weekly" className="mt-4 space-y-3">
            {!d.activeStudent ? (
              <EmptyConnect onGo={() => setTab("connect")} />
            ) : d.latestReport ? (
              <section className="rounded-3xl bg-card p-5 shadow-soft">
                <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                  <CalendarRange className="h-3.5 w-3.5" /> Week {d.latestReport.weekKey}
                </div>
                <h2 className="mt-2 font-display text-xl font-bold">This week, calmly</h2>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <MiniMetric label="Hours" value={`${Math.round(d.latestReport.studyMinutes / 60)}`} />
                  <MiniMetric label="Planner" value={`${d.latestReport.plannerCompletionPct}%`} />
                  <MiniMetric label="Mocks" value={`${d.latestReport.mockExamsAttempted}`} />
                </div>
                <h3 className="mt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Strengths
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {d.latestReport.strengths.map((s, i) => (
                    <li key={i} className="rounded-xl bg-success/5 px-3 py-2 text-sm text-foreground">
                      • {s}
                    </li>
                  ))}
                </ul>
                {d.latestReport.weakChapters.length > 0 && (
                  <>
                    <h3 className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Growing chapters
                    </h3>
                    <ul className="mt-2 space-y-1.5">
                      {d.latestReport.weakChapters.map((c, i) => (
                        <li key={i} className="rounded-xl bg-background/40 px-3 py-2 text-sm text-foreground">
                          {c.subject} · <span className="text-muted-foreground">{c.chapter}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <h3 className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Gentle ideas for you
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {d.latestReport.parentSuggestions.map((s, i) => (
                    <li key={i} className="rounded-xl bg-primary/5 px-3 py-2 text-sm text-foreground">
                      💡 {s}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => void d.regenerateWeeklyReport()}
                  variant="outline"
                  className="mt-4 h-10 w-full rounded-2xl text-xs"
                >
                  <RefreshCw className="mr-1 h-3.5 w-3.5" /> Refresh report
                </Button>
              </section>
            ) : (
              <div className="rounded-2xl bg-card p-4 text-sm text-muted-foreground shadow-soft">
                Your first weekly report will appear here.
              </div>
            )}
          </TabsContent>

          <TabsContent value="connect" className="mt-4 space-y-4">
            <ParentConnectPanel onLinked={() => setTab("overview")} />
            <ShareWithParentCard
              title="Share progress link"
              description="Create a calm summary link for parents — no raw scores or anxiety metrics included."
            />
            <StudentInvitePanel />
            {d.linkedStudents.length > 0 && (
              <section className="rounded-3xl bg-card p-5 shadow-soft">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Linked students
                </h3>
                <ul className="mt-3 space-y-2">
                  {d.linkedStudents.map((l) => (
                    <li
                      key={l.studentUid}
                      className="flex items-center justify-between rounded-2xl bg-background/40 p-3"
                    >
                      <div>
                        <div className="text-sm font-semibold text-foreground">
                          {l.studentName ?? "Linked student"}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Linked {new Date(l.linkedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {l.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </TabsContent>
        </Tabs>
        <div className="h-24" />
      </div>
    </DashboardLayout>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-background/40 p-3">
      <div className="font-display text-lg font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function AlertCard({ alert, onMarkRead }: { alert: ParentAlertDoc; onMarkRead: () => void }) {
  const tone: Record<ParentAlertSeverity, string> = {
    info: "border-border/60 bg-card",
    warning: "border-warning/30 bg-warning/5",
    celebration: "border-success/30 bg-success/5",
  };
  return (
    <article
      className={cn(
        "rounded-3xl border p-4 shadow-soft",
        tone[alert.severity],
        alert.read && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
          <Bell className="h-3.5 w-3.5" /> {alert.kind.replace(/_/g, " ")}
        </div>
        {!alert.read && (
          <button onClick={onMarkRead} className="press text-[11px] font-medium text-primary">
            Mark read
          </button>
        )}
      </div>
      <h3 className="mt-2 font-display text-base font-semibold leading-snug text-foreground">
        {alert.title}
      </h3>
      <p className="mt-1 text-sm text-foreground/80">{alert.body}</p>
      {alert.suggestion && (
        <p className="mt-2 rounded-2xl bg-background/40 px-3 py-2 text-[12px] leading-snug">
          💡 {alert.suggestion}
        </p>
      )}
    </article>
  );
}

function EmptyConnect({ onGo }: { onGo: () => void }) {
  return (
    <section className="rounded-3xl bg-card p-6 text-center shadow-soft">
      <Users className="mx-auto h-8 w-8 text-primary" />
      <h3 className="mt-3 font-display text-lg font-bold">Connect with your child</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Ask them to share their Aura invite code or progress link.
      </p>
      <Button onClick={onGo} className="press mt-4 h-11 rounded-2xl">
        <LinkIcon className="mr-1 h-4 w-4" /> Connect
      </Button>
    </section>
  );
}

function ParentConnectPanel({ onLinked }: { onLinked: () => void }) {
  const d = useParentDashboard();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await d.linkWithCode(code, name || undefined);
    setBusy(false);
    if (res.ok) {
      toast.success("Linked! You'll now see a calm progress summary.");
      setCode("");
      onLinked();
    } else {
      toast.error(res.error);
    }
  };

  return (
    <section className="rounded-3xl bg-card p-5 shadow-soft">
      <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        I&apos;m a parent — link my child
      </h3>
      <form onSubmit={submit} className="mt-3 space-y-3">
        <div>
          <Label htmlFor="code" className="text-xs">
            Invite code
          </Label>
          <Input
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABCD2345"
            maxLength={8}
            className="mt-1 rounded-2xl tracking-[0.3em] uppercase text-center font-display"
          />
        </div>
        <div>
          <Label htmlFor="name" className="text-xs">
            Your child&apos;s name (optional)
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Aarav"
            maxLength={60}
            className="mt-1 rounded-2xl"
          />
        </div>
        <Button type="submit" disabled={busy || code.length < 8} className="press h-11 w-full rounded-2xl">
          {busy ? "Linking…" : "Link account"}
        </Button>
      </form>
    </section>
  );
}

function StudentInvitePanel() {
  const s = useStudentInviteCodes();
  const active = s.invites.filter((i) => !i.used && i.expiresAt > Date.now()).slice(-1)[0];
  const [copied, setCopied] = useState(false);

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="rounded-3xl bg-card p-5 shadow-soft">
      <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        I&apos;m the student — share with my parent
      </h3>
      {active ? (
        <div className="mt-3 rounded-2xl bg-secondary p-4 text-center">
          <div className="font-display text-2xl font-bold tracking-[0.4em] text-primary">
            {active.code}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Expires {new Date(active.expiresAt).toLocaleDateString()}
          </p>
          <Button
            onClick={() => copy(active.code)}
            variant="outline"
            className="press mt-3 h-9 rounded-2xl text-xs"
          >
            {copied ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy code"}
          </Button>
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          Generate a one-time code and share it with your parent.
        </p>
      )}
      <Button
        onClick={() => void s.createInvite()}
        variant={active ? "ghost" : "default"}
        className="press mt-3 h-10 w-full rounded-2xl text-sm"
      >
        {active ? "Generate a new code" : "Generate invite code"}
      </Button>
    </section>
  );
}
