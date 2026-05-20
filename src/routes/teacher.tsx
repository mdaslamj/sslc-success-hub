import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  GraduationCap,
  Users,
  AlertTriangle,
  Sparkles,
  Plus,
  Copy,
  Check,
  RefreshCw,
  ClipboardList,
  BookOpen,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useTeacherDashboard } from "@/hooks/use-teacher-dashboard";
import { ASSIGNMENT_PRESETS } from "@/lib/teacher-intelligence";
import type {
  AssignmentKind,
  ClassRiskAlertDoc,
  TeacherRiskSeverity,
} from "@/integrations/firebase/types";

export const Route = createFileRoute("/teacher")({
  head: () => ({
    meta: [
      { title: "Teacher Dashboard — Project Aura" },
      {
        name: "description",
        content:
          "Class readiness at a glance — weak chapters, risk alerts, and AI teaching insights for your SSLC class.",
      },
    ],
  }),
  component: TeacherPage,
});

function TeacherPage() {
  const d = useTeacherDashboard();
  const [tab, setTab] = useState("overview");

  return (
    <DashboardLayout title="Teacher">
      <div className="mx-auto max-w-md space-y-4 md:max-w-3xl">
        <header className="pt-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-primary">
            <GraduationCap className="h-3.5 w-3.5" /> Teacher view
          </div>
          <h1 className="mt-2 font-display text-[26px] font-bold tracking-tight">
            {d.activeClass?.name ?? "Your class, calmly"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Calm class intelligence — weak chapters, risk alerts, and what to assign next.
          </p>
        </header>

        {d.classes.length > 1 && (
          <Select value={d.activeClass?.classId ?? ""} onValueChange={d.setActiveClass}>
            <SelectTrigger className="h-10 rounded-2xl text-sm">
              <SelectValue placeholder="Pick a class" />
            </SelectTrigger>
            <SelectContent>
              {d.classes.map((c) => (
                <SelectItem key={c.classId} value={c.classId}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 rounded-2xl">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="risk" className="text-xs">
              Risk {d.unacknowledgedRisk > 0 && (
                <span className="ml-1 rounded-full bg-destructive px-1.5 text-[10px] text-destructive-foreground">
                  {d.unacknowledgedRisk}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="insights" className="text-xs">Insights</TabsTrigger>
            <TabsTrigger value="assign" className="text-xs">Assign</TabsTrigger>
            <TabsTrigger value="class" className="text-xs">Class</TabsTrigger>
          </TabsList>

          {/* OVERVIEW */}
          <TabsContent value="overview" className="mt-4 space-y-3">
            {!d.activeClass ? (
              <EmptyCreate onGo={() => setTab("class")} />
            ) : d.analytics ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="Readiness" value={`${d.analytics.averageReadiness}%`} hint="class avg" />
                  <Stat label="Confidence" value={d.analytics.averageConfidence.toFixed(1)} hint="of 5.0" />
                  <Stat label="Weekly focus" value={`${Math.round(d.analytics.averageStudyMinutes / 60)}h`} hint="per student" />
                  <Stat label="Planner" value={`${d.analytics.plannerCompletionPct}%`} hint="completion" />
                </div>

                <section className="rounded-3xl bg-card p-5 shadow-soft">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Performance segmentation
                  </h3>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <SegPill label="On track" value={d.analytics.segmentation.onTrack} tone="success" />
                    <SegPill label="Watch" value={d.analytics.segmentation.needsAttention} tone="warning" />
                    <SegPill label="At risk" value={d.analytics.segmentation.atRisk} tone="destructive" />
                  </div>
                </section>

                {d.analytics.weakChapters.length > 0 && (
                  <section className="rounded-3xl bg-card p-5 shadow-soft">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Weak chapters
                    </h3>
                    <ul className="mt-3 space-y-2">
                      {d.analytics.weakChapters.map((c, i) => (
                        <li
                          key={i}
                          className="flex items-center justify-between rounded-2xl bg-background/40 p-3"
                        >
                          <div>
                            <div className="text-sm font-semibold text-foreground">{c.subject}</div>
                            <div className="text-[11px] text-muted-foreground">{c.chapter}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-display text-sm font-bold">{c.mastery}%</div>
                            <div className="text-[10px] text-muted-foreground">
                              {c.affectedStudents} students
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {d.analytics.commonMistakes.length > 0 && (
                  <section className="rounded-3xl bg-warning/5 border border-warning/30 p-5">
                    <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-warning">
                      <Activity className="h-3.5 w-3.5" /> Repeated mistakes
                    </div>
                    <ul className="mt-2 space-y-1.5">
                      {d.analytics.commonMistakes.map((m, i) => (
                        <li key={i} className="text-sm text-foreground">
                          • {m.label} — <span className="text-muted-foreground">{m.affectedStudents} students</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            ) : (
              <div className="rounded-2xl bg-card p-4 text-sm text-muted-foreground shadow-soft">
                Add students to see class analytics.
              </div>
            )}
          </TabsContent>

          {/* RISK */}
          <TabsContent value="risk" className="mt-4 space-y-3">
            {!d.activeClass ? (
              <EmptyCreate onGo={() => setTab("class")} />
            ) : d.riskAlerts.length === 0 ? (
              <div className="rounded-2xl bg-card p-4 text-sm text-muted-foreground shadow-soft">
                No risk alerts today. Calm and steady.
              </div>
            ) : (
              [...d.riskAlerts]
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((a) => (
                  <RiskCard key={a.id} alert={a} onAck={() => void d.acknowledgeRisk(a.id)} />
                ))
            )}
          </TabsContent>

          {/* INSIGHTS */}
          <TabsContent value="insights" className="mt-4 space-y-3">
            {!d.activeClass ? (
              <EmptyCreate onGo={() => setTab("class")} />
            ) : (
              <>
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {d.insights.length} AI insights
                  </span>
                  <button
                    onClick={() => void d.refreshInsights()}
                    className="press inline-flex items-center gap-1 text-[11px] font-medium text-primary"
                  >
                    <RefreshCw className="h-3 w-3" /> Refresh
                  </button>
                </div>
                {d.insights.length === 0 ? (
                  <div className="rounded-2xl bg-card p-4 text-sm text-muted-foreground shadow-soft">
                    Insights will appear as the class generates data.
                  </div>
                ) : (
                  d.insights.map((i) => (
                    <article
                      key={i.id}
                      className="rounded-3xl border border-primary/20 bg-primary/5 p-4 shadow-soft"
                    >
                      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-primary">
                        <Sparkles className="h-3.5 w-3.5" /> {i.kind.replace(/_/g, " ")}
                      </div>
                      <h3 className="mt-2 font-display text-base font-semibold leading-snug">
                        {i.title}
                      </h3>
                      <p className="mt-1 text-sm text-foreground/80">{i.body}</p>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Affects {i.affectedStudents} students
                      </p>
                      {i.suggestedAssignmentKind && (
                        <Button
                          onClick={() =>
                            void d
                              .createAssignment({
                                kind: i.suggestedAssignmentKind!,
                                subjectId: i.suggestedChapterId,
                                description: i.title,
                              })
                              .then((a) => a && toast.success("Assignment drafted"))
                          }
                          variant="outline"
                          className="press mt-3 h-9 rounded-2xl text-xs"
                        >
                          <Plus className="mr-1 h-3.5 w-3.5" /> Draft assignment
                        </Button>
                      )}
                    </article>
                  ))
                )}
              </>
            )}
          </TabsContent>

          {/* ASSIGN */}
          <TabsContent value="assign" className="mt-4 space-y-4">
            {!d.activeClass ? (
              <EmptyCreate onGo={() => setTab("class")} />
            ) : (
              <>
                <CreateAssignmentPanel />
                {d.assignments.length > 0 && (
                  <section className="rounded-3xl bg-card p-5 shadow-soft">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Recent assignments
                    </h3>
                    <ul className="mt-3 space-y-2">
                      {[...d.assignments]
                        .sort((a, b) => b.createdAt - a.createdAt)
                        .map((a) => (
                          <li
                            key={a.id}
                            className="flex items-center justify-between rounded-2xl bg-background/40 p-3"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold text-foreground">
                                {ASSIGNMENT_PRESETS[a.kind].emoji} {a.title}
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                {a.completedStudents}/{a.totalStudents} done ·{" "}
                                {new Date(a.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                            <Badge variant="secondary" className="text-[10px]">{a.status}</Badge>
                          </li>
                        ))}
                    </ul>
                  </section>
                )}
              </>
            )}
          </TabsContent>

          {/* CLASS */}
          <TabsContent value="class" className="mt-4 space-y-4">
            <CreateClassPanel onCreated={() => setTab("overview")} />
            {d.activeClass && (
              <>
                <section className="rounded-3xl bg-card p-5 shadow-soft">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Class invite code
                  </h3>
                  <InviteCodeBlock code={d.activeClass.inviteCode} />
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Share this code with students to add them to {d.activeClass.name}.
                  </p>
                </section>
                <section className="rounded-3xl bg-card p-5 shadow-soft">
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Users className="h-3.5 w-3.5" /> Roster ({d.students.length})
                  </h3>
                  {d.students.length === 0 ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                      No students yet — share the invite code above.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {d.students.map((s) => (
                        <li
                          key={s.studentUid}
                          className="flex items-center justify-between rounded-2xl bg-background/40 p-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-foreground">
                              {s.rollNo ? `${s.rollNo}. ` : ""}
                              {s.studentName ?? "Student"}
                            </div>
                            {s.lastSummary && (
                              <div className="text-[11px] text-muted-foreground">
                                Readiness {Math.round(s.lastSummary.boardReadiness)}% · confidence{" "}
                                {s.lastSummary.averageConfidence.toFixed(1)}
                              </div>
                            )}
                          </div>
                          <Badge variant="secondary" className="text-[10px]">{s.status}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}
          </TabsContent>
        </Tabs>
        <div className="h-24" />
      </div>
    </DashboardLayout>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-soft">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-xl font-bold text-foreground">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function SegPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "warning" | "destructive";
}) {
  const styles: Record<string, string> = {
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
  };
  return (
    <div className={cn("rounded-2xl p-3", styles[tone])}>
      <div className="font-display text-xl font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wider opacity-80">{label}</div>
    </div>
  );
}

function RiskCard({
  alert,
  onAck,
}: {
  alert: ClassRiskAlertDoc;
  onAck: () => void;
}) {
  const tone: Record<TeacherRiskSeverity, string> = {
    info: "border-border/60 bg-card",
    warning: "border-warning/30 bg-warning/5",
    critical: "border-destructive/30 bg-destructive/5",
  };
  return (
    <article
      className={cn(
        "rounded-3xl border p-4 shadow-soft",
        tone[alert.severity],
        alert.acknowledged && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5" /> {alert.kind.replace(/_/g, " ")}
        </div>
        {!alert.acknowledged && (
          <button onClick={onAck} className="press text-[11px] font-medium text-primary">
            Acknowledge
          </button>
        )}
      </div>
      <h3 className="mt-2 font-display text-base font-semibold leading-snug">{alert.title}</h3>
      <p className="mt-1 text-sm text-foreground/80">{alert.body}</p>
      {alert.suggestedAction && (
        <p className="mt-2 rounded-2xl bg-background/40 px-3 py-2 text-[12px] leading-snug">
          💡 {alert.suggestedAction}
        </p>
      )}
    </article>
  );
}

function EmptyCreate({ onGo }: { onGo: () => void }) {
  return (
    <section className="rounded-3xl bg-card p-6 text-center shadow-soft">
      <GraduationCap className="mx-auto h-8 w-8 text-primary" />
      <h3 className="mt-3 font-display text-lg font-bold">Create your first class</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Name your class, then share the invite code with your students.
      </p>
      <Button onClick={onGo} className="press mt-4 h-11 rounded-2xl">
        <Plus className="mr-1 h-4 w-4" /> New class
      </Button>
    </section>
  );
}

function CreateClassPanel({ onCreated }: { onCreated: () => void }) {
  const d = useTeacherDashboard();
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [section, setSection] = useState("");
  const [batch, setBatch] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const cls = await d.createNewClass(name.trim(), {
      school: school.trim() || undefined,
      section: section.trim() || undefined,
      batch: batch.trim() || undefined,
    });
    setBusy(false);
    if (cls) {
      toast.success(`${cls.name} created — invite code ${cls.inviteCode}`);
      setName("");
      setSection("");
      setBatch("");
      onCreated();
    }
  };

  return (
    <section className="rounded-3xl bg-card p-5 shadow-soft">
      <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        New class
      </h3>
      <form onSubmit={submit} className="mt-3 space-y-3">
        <div>
          <Label htmlFor="cname" className="text-xs">Class name</Label>
          <Input
            id="cname"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="SSLC — A"
            maxLength={60}
            className="mt-1 rounded-2xl"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="section" className="text-xs">Section</Label>
            <Input
              id="section"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="A"
              maxLength={4}
              className="mt-1 rounded-2xl"
            />
          </div>
          <div>
            <Label htmlFor="batch" className="text-xs">Batch</Label>
            <Input
              id="batch"
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              placeholder="2026"
              maxLength={8}
              className="mt-1 rounded-2xl"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="school" className="text-xs">School (optional)</Label>
          <Input
            id="school"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            placeholder="St. Joseph's High School"
            maxLength={120}
            className="mt-1 rounded-2xl"
          />
        </div>
        <Button type="submit" disabled={busy || !name.trim()} className="press h-11 w-full rounded-2xl">
          {busy ? "Creating…" : "Create class"}
        </Button>
      </form>
    </section>
  );
}

function InviteCodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="mt-3 rounded-2xl bg-secondary p-4 text-center">
      <div className="font-display text-2xl font-bold tracking-[0.4em] text-primary">{code}</div>
      <Button onClick={copy} variant="outline" className="press mt-3 h-9 rounded-2xl text-xs">
        {copied ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

function CreateAssignmentPanel() {
  const d = useTeacherDashboard();
  const [kind, setKind] = useState<AssignmentKind>("chapter_practice");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const a = await d.createAssignment({ kind, title: title.trim() || undefined });
    setBusy(false);
    if (a) {
      toast.success("Assignment created");
      setTitle("");
    }
  };

  return (
    <section className="rounded-3xl bg-card p-5 shadow-soft">
      <h3 className="flex items-center gap-1.5 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        <ClipboardList className="h-3.5 w-3.5" /> Assign work
      </h3>
      <form onSubmit={submit} className="mt-3 space-y-3">
        <div>
          <Label className="text-xs">Type</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as AssignmentKind)}>
            <SelectTrigger className="mt-1 h-10 rounded-2xl text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ASSIGNMENT_PRESETS) as AssignmentKind[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {ASSIGNMENT_PRESETS[k].emoji} {ASSIGNMENT_PRESETS[k].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="atitle" className="text-xs">Title (optional)</Label>
          <Input
            id="atitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={ASSIGNMENT_PRESETS[kind].defaultTitle()}
            maxLength={120}
            className="mt-1 rounded-2xl"
          />
        </div>
        <Button type="submit" disabled={busy} className="press h-11 w-full rounded-2xl">
          <BookOpen className="mr-1 h-4 w-4" /> {busy ? "Creating…" : "Create assignment"}
        </Button>
      </form>
    </section>
  );
}