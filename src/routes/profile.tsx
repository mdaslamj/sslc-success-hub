import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { LogOut, Save, User as UserIcon } from "lucide-react";
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
import { useAuth } from "@/contexts/auth-context";
import { patchUserProfile } from "@/integrations/firebase/services/users";
import type { PreferredLanguage } from "@/integrations/firebase/types";
import { subjects } from "@/lib/mock-data";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — VidyaPath SSLC Prep" },
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
      <div className="mx-auto max-w-3xl space-y-6">
        <ProfileCard
          profile={profile}
          onSaved={refreshProfile}
          onSignOut={async () => {
            await signOut();
            toast.success("Signed out");
            navigate({ to: "/login" });
          }}
        />
      </div>
    </DashboardLayout>
  );
}

function ProfileCard({
  profile,
  onSaved,
  onSignOut,
}: {
  profile: NonNullable<ReturnType<typeof useAuth>["profile"]>;
  onSaved: () => Promise<void>;
  onSignOut: () => Promise<void>;
}) {
  const [studentName, setStudentName] = useState(profile.studentName);
  const [classLevel, setClassLevel] = useState(profile.classLevel);
  const [targetScore, setTargetScore] = useState(String(profile.targetScore));
  const [language, setLanguage] = useState<PreferredLanguage>(
    profile.preferredLanguage,
  );
  const [weakSubjects, setWeakSubjects] = useState<string[]>(profile.weakSubjects);
  const [goals, setGoals] = useState(profile.studyGoals.join("\n"));
  const [busy, setBusy] = useState(false);

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
    if (!studentName.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    if (Number.isNaN(target) || target < 0 || target > 100) {
      toast.error("Target score must be between 0 and 100.");
      return;
    }
    setBusy(true);
    try {
      await patchUserProfile(profile.uid, {
        studentName: studentName.trim(),
        classLevel: classLevel.trim() || "10",
        targetScore: Math.round(target),
        preferredLanguage: language,
        weakSubjects,
        studyGoals: goals
          .split("\n")
          .map((g) => g.trim())
          .filter(Boolean)
          .slice(0, 10),
      });
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
      className="rounded-2xl border border-border/60 bg-card p-6 shadow-card space-y-6"
    >
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-brand shadow-glow shrink-0">
            <UserIcon className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-semibold truncate">
              {profile.displayName || profile.studentName || "Student"}
            </h2>
            <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1"
          onClick={onSignOut}
        >
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </header>

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