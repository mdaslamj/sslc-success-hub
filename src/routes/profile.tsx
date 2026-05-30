import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  LogOut,
  Save,
  User as UserIcon,
  Sparkles,
  Bell,
  Timer,
  Sun,
  Moon,
  MonitorSmartphone,
  Trophy,
  Flame,
  BookOpen,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { useUserSettings } from "@/hooks/use-user-settings";
import { useAnalytics } from "@/hooks/use-analytics";
import { useAchievements } from "@/hooks/use-achievements";
import { patchUserProfile } from "@/integrations/firebase/services/users";
import { syncStudentDisplayName } from "@/lib/student-display-name";
import { useDisplayName } from "@/hooks/use-display-name";
import { AuraDevResetAction } from "@/components/dev/AuraDevResetAction";
import { GroupPlanCard } from "@/components/settings/GroupPlanCard";
import { ProfileConstellationSection } from "@/components/profile/ProfileConstellationSection";
import { ShareWithParentCard } from "@/components/parent/ShareWithParentCard";
import type { PreferredLanguage } from "@/integrations/firebase/types";
import { requestNotificationPermission } from "@/lib/notifications";
import { subjects } from "@/lib/mock-data";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Aura — Profile" },
      {
        name: "description",
        content: "Manage your student profile, target score and study preferences.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const { user, profile, loading, signOut, refreshProfile } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading || !profile) {
    return (
      <DashboardLayout title="Profile">
        <div className="mx-auto max-w-3xl py-10 text-sm text-muted-foreground">
          Loading profile…
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Profile">
      <div className="mx-auto max-w-3xl space-y-4">
        <ProfileConstellationSection />
        <ProfileHeader
          profile={profile}
          onSignOut={async () => {
            await signOut();
            toast.success("Signed out");
            navigate({ to: "/login" });
          }}
        />
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3 rounded-xl">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
          </TabsList>
          <TabsContent value="profile" className="mt-4 space-y-4">
            <ProfileCard profile={profile} onSaved={refreshProfile} />
            <ShareWithParentCard />
          </TabsContent>
          <TabsContent value="settings" className="mt-4">
            <SettingsCard />
            {import.meta.env.DEV ? (
              <section className="mt-4 rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
                <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                  Developer tools
                </h3>
                <p className="text-xs text-muted-foreground">
                  Clear stale local caches, exam/chapter data, and planner state. Keeps your
                  Firebase sign-in.
                </p>
                <AuraDevResetAction />
              </section>
            ) : null}
          </TabsContent>
          <TabsContent value="progress" className="mt-4">
            <ProgressCard />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

const EMOJI_AVATARS = ["🦊", "🦁", "🐼", "🐯", "🦉", "🐧", "🚀", "⭐️", "🎯", "📚", "🧠", "🌟"];

function ProfileHeader({
  profile,
  onSignOut,
}: {
  profile: NonNullable<ReturnType<typeof useAuth>["profile"]>;
  onSignOut: () => Promise<void>;
}) {
  const { displayName } = useDisplayName();

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-card flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-brand shadow-glow shrink-0 text-xl">
        {profile.avatarEmoji || (
          <UserIcon className="h-5 w-5 text-primary-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-base sm:text-lg font-semibold truncate">
          {displayName}
        </h2>
        <p className="text-xs text-muted-foreground truncate">
          Class {profile.classLevel} · Target {profile.targetScore}%
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="gap-1 shrink-0"
        onClick={onSignOut}
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Sign out</span>
      </Button>
    </div>
  );
}

function ProfileCard({
  profile,
  onSaved,
}: {
  profile: NonNullable<ReturnType<typeof useAuth>["profile"]>;
  onSaved: () => Promise<void>;
}) {
  const [studentName, setStudentName] = useState(profile.studentName);
  const [classLevel, setClassLevel] = useState(profile.classLevel);
  const [targetScore, setTargetScore] = useState(String(profile.targetScore));
  const [language, setLanguage] = useState<PreferredLanguage>(
    profile.preferredLanguage,
  );
  const [weakSubjects, setWeakSubjects] = useState<string[]>(profile.weakSubjects);
  const [goals, setGoals] = useState(profile.studyGoals.join("\n"));
  const [avatarEmoji, setAvatarEmoji] = useState(profile.avatarEmoji ?? "");
  const [dailyGoal, setDailyGoal] = useState(
    String(profile.dailyStudyGoalMinutes ?? 90),
  );
  const [examDate, setExamDate] = useState(profile.examTargetDate ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setStudentName(profile.studentName || profile.displayName || "");
    setClassLevel(profile.classLevel);
    setTargetScore(String(profile.targetScore));
    setLanguage(profile.preferredLanguage);
    setWeakSubjects(profile.weakSubjects);
    setGoals(profile.studyGoals.join("\n"));
    setAvatarEmoji(profile.avatarEmoji ?? "");
    setDailyGoal(String(profile.dailyStudyGoalMinutes ?? 90));
    setExamDate(profile.examTargetDate ?? "");
  }, [
    profile.studentName,
    profile.displayName,
    profile.classLevel,
    profile.targetScore,
    profile.preferredLanguage,
    profile.weakSubjects,
    profile.studyGoals,
    profile.avatarEmoji,
    profile.dailyStudyGoalMinutes,
    profile.examTargetDate,
    profile.updatedAt,
  ]);

  const subjectOptions = useMemo(
    () => subjects.map((s) => ({ id: s.id, name: s.name, emoji: s.emoji })),
    [],
  );

  const toggleWeak = (id: string) =>
    setWeakSubjects((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const target = Number(targetScore);
    const daily = Number(dailyGoal);
    if (!studentName.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    if (Number.isNaN(target) || target < 0 || target > 100) {
      toast.error("Target score must be between 0 and 100.");
      return;
    }
    if (Number.isNaN(daily) || daily < 10 || daily > 600) {
      toast.error("Daily study goal must be 10–600 minutes.");
      return;
    }
    setBusy(true);
    try {
      await patchUserProfile(profile.uid, {
        studentName: studentName.trim(),
        displayName: studentName.trim(),
        classLevel: classLevel.trim() || "10",
        targetScore: Math.round(target),
        preferredLanguage: language,
        weakSubjects,
        studyGoals: goals
          .split("\n")
          .map((g) => g.trim())
          .filter(Boolean)
          .slice(0, 10),
        avatarEmoji: avatarEmoji || undefined,
        dailyStudyGoalMinutes: Math.round(daily),
        examTargetDate: examDate || undefined,
      });
      syncStudentDisplayName(studentName.trim());
      await onSaved();
      toast.success("Profile updated");
    } catch (err) {
      console.error(err);
      toast.error("Could not save profile. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6 shadow-card space-y-6"
    >
      <Row label="Avatar">
        <div className="flex flex-wrap gap-1.5">
          {EMOJI_AVATARS.map((e) => (
            <button
              type="button"
              key={e}
              onClick={() => setAvatarEmoji(e === avatarEmoji ? "" : e)}
              className={`h-9 w-9 rounded-xl text-lg transition-all ${
                avatarEmoji === e
                  ? "bg-primary/15 ring-2 ring-primary scale-105"
                  : "bg-secondary/60 hover:bg-secondary"
              }`}
              aria-label={`Avatar ${e}`}
            >
              {e}
            </button>
          ))}
        </div>
      </Row>

      <div className="grid gap-4 sm:grid-cols-2">
        <Row label="Student name">
          <Input
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            maxLength={80}
            required
          />
        </Row>
        <Row label="Class">
          <Input
            value={classLevel}
            onChange={(e) => setClassLevel(e.target.value)}
            maxLength={10}
          />
        </Row>
        <Row label="Target score (%)">
          <Input
            type="number"
            min={0}
            max={100}
            value={targetScore}
            onChange={(e) => setTargetScore(e.target.value)}
          />
        </Row>
        <Row label="Preferred language">
          <Select
            value={language}
            onValueChange={(v) => setLanguage(v as PreferredLanguage)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="kn">ಕನ್ನಡ (Kannada)</SelectItem>
              <SelectItem value="bilingual">Bilingual</SelectItem>
            </SelectContent>
          </Select>
        </Row>
        <Row label="Daily study goal (min)">
          <Input
            type="number"
            min={10}
            max={600}
            value={dailyGoal}
            onChange={(e) => setDailyGoal(e.target.value)}
          />
        </Row>
        <Row label="Exam target date">
          <Input
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
          />
        </Row>
      </div>

      <Row label="Weak subjects">
        <div className="flex flex-wrap gap-2">
          {subjectOptions.map((s) => {
            const active = weakSubjects.includes(s.id);
            return (
              <button
                type="button"
                key={s.id}
                onClick={() => toggleWeak(s.id)}
                className="focus:outline-none"
              >
                <Badge
                  variant={active ? "default" : "outline"}
                  className="rounded-full cursor-pointer"
                >
                  <span className="mr-1">{s.emoji}</span>
                  {s.name}
                </Badge>
              </button>
            );
          })}
        </div>
      </Row>

      <Row
        label="Study goals"
        hint="One goal per line. Used by the planner and recommendations."
      >
        <Textarea
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="Score 95+ in Math&#10;Finish Physics syllabus by Feb"
        />
      </Row>

      <div className="flex justify-end">
        <Button type="submit" className="gap-1" disabled={busy}>
          <Save className="h-4 w-4" /> {busy ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function SettingsCard() {
  const { user } = useAuth();
  const { settings, loading, update } = useUserSettings();
  const { theme, setTheme } = useTheme();
  const [pushBusy, setPushBusy] = useState(false);
  const pushEnabled =
    typeof Notification !== "undefined" && Notification.permission === "granted";

  if (loading || !settings) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground">
        Loading settings…
      </div>
    );
  }

  const focus = settings.focusTimer!;
  const ai = settings.aiAssistant!;
  const reminders = settings.reminders ?? {};

  return (
    <div className="space-y-4">
      <GroupPlanCard />

      {/* Appearance */}
      <Section title="Appearance" icon={<Sun className="h-4 w-4" />}>
        <div className="grid grid-cols-3 gap-2">
          {([
            { v: "light", label: "Light", icon: <Sun className="h-4 w-4" /> },
            { v: "dark", label: "Dark", icon: <Moon className="h-4 w-4" /> },
            {
              v: "system",
              label: "System",
              icon: <MonitorSmartphone className="h-4 w-4" />,
            },
          ] as const).map((opt) => (
            <button
              key={opt.v}
              type="button"
              onClick={() => {
                setTheme(opt.v);
                update({ theme: opt.v });
              }}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-3 text-xs transition-all ${
                theme === opt.v
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border/60 bg-secondary/40 text-muted-foreground hover:bg-secondary/70"
              }`}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Notifications" icon={<Bell className="h-4 w-4" />}>
        <ToggleRow
          label="Push notifications"
          hint="Daily session reminders and evaluation alerts"
          checked={pushEnabled}
          onChange={async (v) => {
            if (!v || !user) return;
            setPushBusy(true);
            try {
              const granted = await requestNotificationPermission(user.uid, {
                dailyDigest: settings.notifications.dailyDigest,
                revisionReminders: settings.notifications.revisionReminders,
                plannerAlerts: settings.notifications.plannerAlerts ?? true,
                studyReminderTime: reminders.studyReminderTime ?? "18:00",
                revisionReminderTime: reminders.revisionReminderTime ?? "20:30",
              });
              if (granted) {
                toast.success("Push notifications enabled");
              } else {
                toast.error("Could not enable push notifications");
              }
            } finally {
              setPushBusy(false);
            }
          }}
        />
        {pushBusy ? (
          <p className="text-xs text-muted-foreground">Enabling push notifications…</p>
        ) : null}
        <ToggleRow
          label="Daily digest"
          hint="Morning summary of today's plan"
          checked={settings.notifications.dailyDigest}
          onChange={async (v) => {
            await update({ notifications: { ...settings.notifications, dailyDigest: v } });
            if (v && user && Notification.permission === "default") {
              setPushBusy(true);
              try {
                await requestNotificationPermission(user.uid, {
                  dailyDigest: v,
                  revisionReminders: settings.notifications.revisionReminders,
                  plannerAlerts: settings.notifications.plannerAlerts ?? true,
                  studyReminderTime: reminders.studyReminderTime ?? "18:00",
                  revisionReminderTime: reminders.revisionReminderTime ?? "20:30",
                });
              } finally {
                setPushBusy(false);
              }
            }
          }}
        />
        <ToggleRow
          label="Revision reminders"
          hint="Spaced-repetition nudges"
          checked={settings.notifications.revisionReminders}
          onChange={(v) =>
            update({ notifications: { ...settings.notifications, revisionReminders: v } })
          }
        />
        <ToggleRow
          label="Planner alerts"
          checked={settings.notifications.plannerAlerts ?? true}
          onChange={(v) =>
            update({ notifications: { ...settings.notifications, plannerAlerts: v } })
          }
        />
        <ToggleRow
          label="Achievement unlocks"
          checked={settings.notifications.achievementAlerts ?? true}
          onChange={(v) =>
            update({ notifications: { ...settings.notifications, achievementAlerts: v } })
          }
        />
        <div className="grid grid-cols-2 gap-3 pt-2">
          <Row label="Study reminder">
            <Input
              type="time"
              value={reminders.studyReminderTime ?? "18:00"}
              onChange={(e) =>
                update({ reminders: { ...reminders, studyReminderTime: e.target.value } })
              }
            />
          </Row>
          <Row label="Revision reminder">
            <Input
              type="time"
              value={reminders.revisionReminderTime ?? "20:30"}
              onChange={(e) =>
                update({ reminders: { ...reminders, revisionReminderTime: e.target.value } })
              }
            />
          </Row>
        </div>
      </Section>

      {/* Focus timer */}
      <Section title="Focus timer" icon={<Timer className="h-4 w-4" />}>
        <SliderRow
          label="Focus"
          unit="min"
          min={5}
          max={60}
          value={focus.focusMinutes}
          onChange={(v) => update({ focusTimer: { ...focus, focusMinutes: v } })}
        />
        <SliderRow
          label="Short break"
          unit="min"
          min={1}
          max={15}
          value={focus.shortBreakMinutes}
          onChange={(v) => update({ focusTimer: { ...focus, shortBreakMinutes: v } })}
        />
        <SliderRow
          label="Long break"
          unit="min"
          min={5}
          max={45}
          value={focus.longBreakMinutes}
          onChange={(v) => update({ focusTimer: { ...focus, longBreakMinutes: v } })}
        />
        <ToggleRow
          label="Auto-start breaks"
          checked={focus.autoStartBreaks}
          onChange={(v) => update({ focusTimer: { ...focus, autoStartBreaks: v } })}
        />
        <ToggleRow
          label="Sound on completion"
          checked={focus.soundEnabled}
          onChange={(v) => update({ focusTimer: { ...focus, soundEnabled: v } })}
        />
      </Section>

      {/* AI assistant */}
      <Section title="AI assistant" icon={<Sparkles className="h-4 w-4" />}>
        <ToggleRow
          label="Enable AI assistant"
          hint="Personalized tips, recommendations, and tutoring"
          checked={ai.enabled}
          onChange={(v) => update({ aiAssistant: { ...ai, enabled: v } })}
        />
        <ToggleRow
          label="Daily tips"
          checked={ai.dailyTips}
          onChange={(v) => update({ aiAssistant: { ...ai, dailyTips: v } })}
        />
        <Row label="Assistant tone">
          <Select
            value={ai.tone}
            onValueChange={(v) =>
              update({ aiAssistant: { ...ai, tone: v as typeof ai.tone } })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="friendly">Friendly</SelectItem>
              <SelectItem value="concise">Concise</SelectItem>
              <SelectItem value="coach">Coach</SelectItem>
            </SelectContent>
          </Select>
        </Row>
      </Section>
    </div>
  );
}

function ProgressCard() {
  const a = useAnalytics();
  const ach = useAchievements();
  const earnedCount = ach.earned.length;

  const stats = [
    {
      label: "XP",
      value: ach.xp.toLocaleString(),
      icon: <Sparkles className="h-4 w-4" />,
      sub: `Level ${ach.level.level}`,
    },
    {
      label: "Consistency",
      value: `${a.consistency.daysActiveLast14}/14`,
      icon: <Flame className="h-4 w-4" />,
      sub: a.consistency.label,
    },
    {
      label: "Chapters",
      value: String(a.completedChapters),
      icon: <BookOpen className="h-4 w-4" />,
      sub: `of ${a.totalChapters}`,
    },
    {
      label: "Study hours",
      value: String(a.totalStudyHours),
      icon: <Clock className="h-4 w-4" />,
      sub: `${a.focusSessions} focus`,
    },
    {
      label: "Achievements",
      value: String(earnedCount),
      icon: <Trophy className="h-4 w-4" />,
      sub: `of ${ach.all.length}`,
    },
    {
      label: "Progress",
      value: `${a.overallProgress}%`,
      icon: <Sparkles className="h-4 w-4" />,
      sub: "syllabus",
    },
  ];

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6 shadow-card space-y-4">
      <h3 className="font-display text-sm font-semibold">Your progress</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-border/50 bg-secondary/40 p-3"
          >
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
              {s.icon}
              {s.label}
            </div>
            <div className="mt-1 font-display text-xl font-semibold">{s.value}</div>
            <div className="text-[11px] text-muted-foreground">{s.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6 shadow-card space-y-3">
      <header className="flex items-center gap-2 text-sm font-semibold">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        {title}
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-secondary/30 px-3 py-2.5">
      <div className="min-w-0">
        <div className="text-sm">{label}</div>
        {hint ? <div className="text-[11px] text-muted-foreground">{hint}</div> : null}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SliderRow({
  label,
  unit,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  unit: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <Label className="text-xs">{label}</Label>
        <span className="font-mono text-muted-foreground">
          {value} {unit}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={1}
        value={[value]}
        onValueChange={(v) => onChange(v[0]!)}
      />
    </div>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}