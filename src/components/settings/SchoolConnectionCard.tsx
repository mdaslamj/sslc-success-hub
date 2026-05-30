import { Link } from "@tanstack/react-router";
import { GraduationCap, Loader2, LogOut } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useAuth } from "@/contexts/auth-context";
import { joinSchoolByCode, leaveSchool } from "@/lib/schoolService";

export function SchoolConnectionCard() {
  const { user, profile, refreshProfile } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);

  if (!user || !profile) return null;

  const hasSchool = Boolean(profile.schoolId && profile.schoolName);

  const handleJoin = async () => {
    const trimmed = code.trim();
    if (trimmed.length < 3) {
      toast.error("Enter a valid school code");
      return;
    }
    setBusy(true);
    try {
      const result = await joinSchoolByCode(
        trimmed,
        user.uid,
        profile.studentName || profile.displayName,
      );
      if (result.error === "already_joined") {
        toast.info(`You are already part of ${result.school?.name ?? "this school"}`);
        await refreshProfile();
        return;
      }
      if (!result.success) {
        toast.error(result.error ?? "Could not join school");
        return;
      }
      setCode("");
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
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="gap-2 text-destructive hover:text-destructive"
                disabled={leaving}
              >
                {leaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
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
            <Button type="button" disabled={busy} onClick={() => void handleJoin()}>
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining…
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
