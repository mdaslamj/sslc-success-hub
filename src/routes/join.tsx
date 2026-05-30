import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, GraduationCap, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import {
  joinSchoolByCode,
  PENDING_SCHOOL_JOIN_KEY,
  resolveSchoolByCode,
} from "@/lib/schoolService";
import type { School, SchoolType } from "@/types/school";

const searchSchema = z.object({
  school: z.string().optional(),
  code: z.string().optional(),
});

type Screen =
  | "entry"
  | "found"
  | "auth"
  | "success"
  | "already_joined";

export const Route = createFileRoute("/join")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Aura — Join your school" },
      {
        name: "description",
        content: "Link your Aura account to your school with a code from your teacher.",
      },
    ],
  }),
  component: JoinSchoolPage,
});

const SCHOOL_TYPE_LABELS: Record<SchoolType, string> = {
  government: "Government School",
  private_aided: "Private Aided",
  private_unaided: "Private Unaided",
};

function JoinSchoolPage() {
  const { school: schoolParam, code: codeParam } = Route.useSearch();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();

  const initialCode = (schoolParam ?? codeParam ?? "").trim().toUpperCase();
  const [codeInput, setCodeInput] = useState(initialCode);
  const [screen, setScreen] = useState<Screen>("entry");
  const [school, setSchool] = useState<School | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(Boolean(initialCode));

  const performJoin = useCallback(
    async (targetSchool: School, joinCode: string) => {
      if (!user) {
        sessionStorage.setItem(
          PENDING_SCHOOL_JOIN_KEY,
          JSON.stringify({ code: joinCode, schoolId: targetSchool.schoolId }),
        );
        setScreen("auth");
        return;
      }

      setJoining(true);
      try {
        const result = await joinSchoolByCode(
          joinCode,
          user.uid,
          profile?.studentName || profile?.displayName,
        );
        if (result.error === "already_joined") {
          setSchool(result.school ?? targetSchool);
          setScreen("already_joined");
          return;
        }
        if (!result.success) {
          toast.error(result.error ?? "Could not join school");
          return;
        }
        sessionStorage.removeItem(PENDING_SCHOOL_JOIN_KEY);
        setSchool(result.school ?? targetSchool);
        await refreshProfile();
        setScreen("success");
      } catch (err) {
        console.error(err);
        toast.error("Something went wrong. Please try again.");
      } finally {
        setJoining(false);
      }
    },
    [user, profile, refreshProfile],
  );

  const lookupCode = useCallback(async (raw: string) => {
    const normalized = raw.trim().toUpperCase();
    if (!normalized) {
      setLookupError("Enter a school code");
      return;
    }
    setLookupLoading(true);
    setLookupError(null);
    try {
      const found = await resolveSchoolByCode(normalized);
      if (!found) {
        setSchool(null);
        setScreen("entry");
        setLookupError("School code not found. Check with your teacher and try again.");
        return;
      }
      setSchool(found);
      setCodeInput(found.schoolCode);
      setScreen("found");
    } catch (err) {
      console.error(err);
      setLookupError("Could not look up that code. Please try again.");
    } finally {
      setLookupLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialCode) return;
    void lookupCode(initialCode);
  }, [initialCode, lookupCode]);

  useEffect(() => {
    if (authLoading || !user || !school) return;

    if (profile?.schoolId && profile.schoolId === school.schoolId) {
      setScreen("already_joined");
      return;
    }

    const pendingRaw = sessionStorage.getItem(PENDING_SCHOOL_JOIN_KEY);
    if (!pendingRaw) return;

    try {
      const pending = JSON.parse(pendingRaw) as { code?: string; schoolId?: string };
      if (pending.schoolId === school.schoolId || pending.code) {
        void performJoin(school, pending.code ?? school.schoolCode);
      }
    } catch {
      sessionStorage.removeItem(PENDING_SCHOOL_JOIN_KEY);
    }
  }, [authLoading, user, school, profile?.schoolId, performJoin]);

  const loginRedirect = `/join?school=${encodeURIComponent(school?.schoolCode ?? codeInput)}`;

  return (
    <div
      className="min-h-[100dvh] px-4 py-8"
      style={{
        background: "#08080E",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        paddingBottom: "max(env(safe-area-inset-bottom), 2rem)",
      }}
    >
      <div className="mx-auto max-w-lg">
        <header className="mb-8 text-center">
          <div
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ background: "rgba(139,92,246,0.2)" }}
          >
            <GraduationCap className="h-6 w-6 text-[#8B5CF6]" />
          </div>
        </header>

        {lookupLoading && screen === "entry" ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#8B5CF6]" />
          </div>
        ) : null}

        {!lookupLoading && screen === "entry" ? (
          <CodeEntryScreen
            code={codeInput}
            error={lookupError}
            loading={lookupLoading}
            onCodeChange={(v) => {
              setCodeInput(v.toUpperCase());
              setLookupError(null);
            }}
            onSubmit={() => void lookupCode(codeInput)}
            onSkip={() => void navigate({ to: profile?.onboardingCompletedAt ? "/" : "/onboarding" })}
          />
        ) : null}

        {screen === "found" && school ? (
          <SchoolFoundScreen
            school={school}
            joining={joining}
            onJoin={() => void performJoin(school, school.schoolCode)}
            onBack={() => {
              setSchool(null);
              setScreen("entry");
              setLookupError(null);
            }}
          />
        ) : null}

        {screen === "auth" && school ? (
          <AuthRequiredScreen school={school} loginRedirect={loginRedirect} />
        ) : null}

        {screen === "success" && school ? (
          <SuccessScreen
            school={school}
            onContinue={() => void navigate({ to: "/planner" })}
          />
        ) : null}

        {screen === "already_joined" && school ? (
          <AlreadyJoinedScreen
            school={school}
            onContinue={() => void navigate({ to: "/" })}
          />
        ) : null}
      </div>
    </div>
  );
}

function CodeEntryScreen({
  code,
  error,
  loading,
  onCodeChange,
  onSubmit,
  onSkip,
}: {
  code: string;
  error: string | null;
  loading: boolean;
  onCodeChange: (v: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="fade-in space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">Join your school on Aura</h1>
        <p className="mt-2 text-sm text-white/70">
          Enter the code your school shared with you
        </p>
      </div>

      <div className="space-y-3">
        <Input
          value={code}
          onChange={(e) => onCodeChange(e.target.value.replace(/\s/g, ""))}
          maxLength={16}
          placeholder="KAR-BGM"
          className="h-14 rounded-xl border-white/10 bg-[#14141F] text-center text-lg font-semibold uppercase tracking-widest text-white"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit();
          }}
        />
        <p className="text-center text-xs text-white/55">e.g. KAR-BGM</p>
        {error ? <p className="text-center text-sm text-red-400">{error}</p> : null}
      </div>

      <Button
        type="button"
        disabled={loading || code.trim().length < 3}
        className="w-full rounded-xl bg-[#8B5CF6] py-6 text-base font-semibold text-white hover:bg-[#7C3AED]"
        onClick={onSubmit}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Finding school…
          </>
        ) : (
          "Find my school"
        )}
      </Button>

      <div className="space-y-2 pt-4 text-center">
        <p className="text-xs text-white/60">
          Don&apos;t have a code? Use Aura without a school — your data stays private.
        </p>
        <button
          type="button"
          onClick={onSkip}
          className="text-sm font-medium text-[#C4B5FD] underline-offset-2 hover:underline"
        >
          Continue without school code
        </button>
      </div>
    </div>
  );
}

function SchoolFoundScreen({
  school,
  joining,
  onJoin,
  onBack,
}: {
  school: School;
  joining: boolean;
  onJoin: () => void;
  onBack: () => void;
}) {
  const typeLabel = school.schoolType ? SCHOOL_TYPE_LABELS[school.schoolType] : null;

  return (
    <div className="fade-in space-y-6">
      <div className="rounded-2xl border border-white/10 bg-[#14141F] p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/55">School found</p>
        <h2 className="mt-2 text-xl font-bold text-white">{school.name}</h2>
        <p className="mt-1 text-sm text-white/70">{school.district}</p>
        {typeLabel ? (
          <span
            className="mt-3 inline-block rounded-full px-3 py-1 text-xs font-medium text-[#C4B5FD]"
            style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.35)" }}
          >
            {typeLabel}
          </span>
        ) : null}
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#14141F] p-5 text-sm text-white/80">
        <p className="font-medium text-white">
          By joining {school.name}, your subject teachers can see:
        </p>
        <ul className="mt-3 space-y-2">
          <li className="flex gap-2 text-green-400/90">✓ Your weak chapters per subject</li>
          <li className="flex gap-2 text-green-400/90">✓ Your gap types (conceptual/procedural)</li>
        </ul>
        <p className="mt-4 font-medium text-white">Your teachers cannot see:</p>
        <ul className="mt-3 space-y-2">
          <li className="flex gap-2 text-white/55">✗ Your study session times</li>
          <li className="flex gap-2 text-white/55">✗ Your personal notes</li>
          <li className="flex gap-2 text-white/55">✗ Your full performance history</li>
        </ul>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          type="button"
          disabled={joining}
          className="w-full rounded-xl bg-[#8B5CF6] py-6 text-base font-semibold text-white hover:bg-[#7C3AED]"
          onClick={onJoin}
        >
          {joining ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Joining…
            </>
          ) : (
            `Join ${school.name}`
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full rounded-xl border-white/10 bg-transparent text-white hover:bg-white/5"
          onClick={onBack}
          disabled={joining}
        >
          Not my school
        </Button>
      </div>
    </div>
  );
}

function AuthRequiredScreen({
  school,
  loginRedirect,
}: {
  school: School;
  loginRedirect: string;
}) {
  return (
    <div className="fade-in space-y-6 text-center">
      <h1 className="text-2xl font-bold text-white">Sign in to join your school</h1>
      <p className="text-sm text-white/70">
        Create an account or sign in to connect with {school.name}.
      </p>
      <div className="flex flex-col gap-3">
        <Button
          asChild
          className="w-full rounded-xl bg-[#8B5CF6] py-6 text-base font-semibold text-white hover:bg-[#7C3AED]"
        >
          <Link to="/login" search={{ redirect: loginRedirect }}>
            Sign in
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="w-full rounded-xl border-white/10 bg-transparent text-white hover:bg-white/5"
        >
          <Link to="/login" search={{ redirect: loginRedirect }}>
            Sign up
          </Link>
        </Button>
      </div>
    </div>
  );
}

function SuccessScreen({
  school,
  onContinue,
}: {
  school: School;
  onContinue: () => void;
}) {
  return (
    <div className="fade-in space-y-6 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15">
        <CheckCircle2 className="h-9 w-9 text-green-400 success-pop" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-white">You have joined {school.name}</h1>
        <p className="mt-2 text-sm text-white/70">Your teachers can now see your progress</p>
      </div>
      <Button
        type="button"
        className="w-full rounded-xl bg-[#8B5CF6] py-6 text-base font-semibold text-white hover:bg-[#7C3AED]"
        onClick={onContinue}
      >
        Start studying
      </Button>
      <style>{`
        .success-pop { animation: pop 0.5s ease-out; }
        @keyframes pop {
          0% { transform: scale(0.6); opacity: 0; }
          70% { transform: scale(1.08); }
          100% { transform: scale(1); opacity: 1; }
        }
        .fade-in { animation: fadeIn 0.35s ease-out; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function AlreadyJoinedScreen({
  school,
  onContinue,
}: {
  school: School;
  onContinue: () => void;
}) {
  return (
    <div className="fade-in space-y-6 text-center">
      <CheckCircle2 className="mx-auto h-12 w-12 text-[#8B5CF6]" />
      <div>
        <h1 className="text-2xl font-bold text-white">You are already part of {school.name}</h1>
      </div>
      <Button
        type="button"
        className="w-full rounded-xl bg-[#8B5CF6] py-6 text-base font-semibold text-white hover:bg-[#7C3AED]"
        onClick={onContinue}
      >
        Go to your plan
      </Button>
    </div>
  );
}
