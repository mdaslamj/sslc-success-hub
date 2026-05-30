import { Link } from "@tanstack/react-router";
import { GraduationCap, Loader2, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SchoolJoinConsent } from "@/components/school/SchoolJoinConsent";
import { useAuth } from "@/contexts/auth-context";
import {
  defaultSubjectSharing,
  getStudentSchoolMembership,
  joinSchoolByCode,
  leaveSchool,
  resolveSchoolByCode,
  updateStudentSubjectSharing,
} from "@/lib/schoolService";
import type { School, SubjectSharingPrefs } from "@/types/school";

const SUBJECT_TOGGLES: { key: keyof SubjectSharingPrefs; label: string }[] = [
  { key: "science", label: "Science" },
  { key: "math", label: "Mathematics" },
  { key: "social", label: "Social Science" },
  { key: "english", label: "English" },
  { key: "kannada", label: "Kannada" },
  { key: "hindi", label: "Hindi" },
];

type JoinPhase = "idle" | "consent";

export function SchoolConnectionCard() {
  const { user, profile, refreshProfile } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [joinPhase, setJoinPhase] = useState<JoinPhase>("idle");
  const [pendingSchool, setPendingSchool] = useState<School | null>(null);
  const [subjectSharing, setSubjectSharing] = useState<SubjectSharingPrefs>(
    defaultSubjectSharing(),
  );
  const [sharingLoading, setSharingLoading] = useState(false);
  const [sharingSaving, setSharingSaving] = useState(false);

  const hasSchool = Boolean(profile?.schoolId && profile?.schoolName);

  useEffect(() => {
    if (!user || !profile?.schoolId || !hasSchool) return;
    let active = true;
    void (async () => {
      setSharingLoading(true);
      try {
        const membership = await getStudentSchoolMembership(user.uid, profile.schoolId!);
        if (active && membership?.subjectSharing) {
          setSubjectSharing({ ...defaultSubjectSharing(), ...membership.subjectSharing });
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setSharingLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [hasSchool, profile?.schoolId, user]);

  if (!user || !profile) return null;

  const handleLookupForJoin = async () => {
    const trimmed = code.trim();
    if (trimmed.length < 3) {
      toast.error("Enter a valid school code");
      return;
    }
    setBusy(true);
    try {
      const found = await resolveSchoolByCode(trimmed);
      if (!found) {
        toast.error("School code not found");
        return;
      }
      setPendingSchool(found);
      setJoinPhase("consent");
    } catch (err) {
      console.error(err);
      toast.error("Could not look up that code");
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmJoin = async () => {
    if (!pendingSchool) return;
    setBusy(true);
    try {
      const result = await joinSchoolByCode(
        pendingSchool.schoolCode,
        user.uid,
        profile.studentName || profile.displayName,
      );
      if (result.error === "already_joined") {
        toast.info(`You are already part of ${result.school?.name ?? "this school"}`);
        await refreshProfile();
        setJoinPhase("idle");
        setPendingSchool(null);
        return;
      }
      if (!result.success) {
        toast.error(result.error ?? "Could not join school");
        return;
      }
      setCode("");
      setJoinPhase("idle");
      setPendingSchool(null);
      await refreshProfile();
      toast.success(`Joined ${result.school?.name ?? "your school"}`);
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async () => {
    if (!profile.schoolId) return;
    setLeaving(true);
    try {
      await leaveSchool(user.uid, profile.schoolId);
      await refreshProfile();
      toast.success("You left your school");
    } catch (err) {
      console.error(err);
      toast.error("Could not leave school. Please try again.");
    } finally {
      setLeaving(false);
    }
  };

  const handleSharingToggle = async (key: keyof SubjectSharingPrefs, enabled: boolean) => {
    if (!profile.schoolId) return;
    const next = { ...subjectSharing, [key]: enabled };
    setSubjectSharing(next);
    setSharingSaving(true);
    try {
      await updateStudentSubjectSharing(user.uid, profile.schoolId, next);
    } catch (err) {
      console.error(err);
      setSubjectSharing(subjectSharing);
      toast.error("Could not update sharing preferences");
    } finally {
      setSharingSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6 shadow-card space-y-4">
      <header className="flex items-center gap-2 text-sm font-semibold">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <GraduationCap className="h-4 w-4" />
        </span>
        School connection
      </header>

      {hasSchool ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/50 bg-secondary/30 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Your school</p>
            <p className="mt-1 font-semibold">{profile.schoolName}</p>
            {profile.schoolCode ? (
              <p
                className="mt-1 text-sm text-muted-foreground"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {profile.schoolCode}
              </p>
            ) : null}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">
              Sharing with {profile.schoolName} teachers:
            </p>
            <p className="text-xs text-muted-foreground">
              Turn off sharing for subjects you prefer to keep private.
            </p>
            {sharingLoading ? (
              <p className="text-sm text-muted-foreground">Loading preferences…</p>
            ) : (
              <div className="space-y-2">
                {SUBJECT_TOGGLES.map(({ key, label }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-3 rounded-lg bg-secondary/30 px-3 py-2.5"
                  >
                    <span className="text-sm">
                      {label}
                      {subjectSharing[key] ? (
                        <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                          sharing ✓
                        </span>
                      ) : (
                        <span className="ml-2 text-xs text-muted-foreground">private</span>
                      )}
                    </span>
                    <Switch
                      checked={subjectSharing[key]}
                      disabled={sharingSaving}
                      onCheckedChange={(v) => void handleSharingToggle(key, v)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="gap-2 text-destructive hover:text-destructive"
                disabled={leaving}
              >
                {leaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                Leave school
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Leave {profile.schoolName}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your teachers will no longer see your progress. You can rejoin anytime with your
                  school code.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => void handleLeave()}>Leave school</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ) : joinPhase === "consent" && pendingSchool ? (
        <SchoolJoinConsent
          schoolName={pendingSchool.name}
          joining={busy}
          variant="light"
          onConfirm={() => void handleConfirmJoin()}
          onCancel={() => {
            setJoinPhase("idle");
            setPendingSchool(null);
          }}
        />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter your school code to let your teachers support your preparation. This is optional —
            Aura works fully without a school.
          </p>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="KAR-BGM"
            className="uppercase tracking-wider"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
            maxLength={16}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" disabled={busy} onClick={() => void handleLookupForJoin()}>
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Looking up…
                </>
              ) : (
                "Join"
              )}
            </Button>
            <Button type="button" variant="ghost" asChild>
              <Link to="/join">Open join page</Link>
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
