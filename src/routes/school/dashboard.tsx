import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { GraduationCap, Loader2, Lock, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { getSchoolForUser, hasSchoolRoster, SCHOOL_WELCOME_STORAGE_KEY } from "@/lib/schoolService";
import type { School } from "@/types/school";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/school/dashboard")({
  head: () => ({
    meta: [{ title: "Aura — School dashboard" }],
  }),
  component: SchoolDashboardPage,
});

function SchoolDashboardPage() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [school, setSchool] = useState<School | null>(null);
  const [loadingSchool, setLoadingSchool] = useState(true);
  const [welcomeCode, setWelcomeCode] = useState<string | null>(null);
  const [rosterImported, setRosterImported] = useState<boolean | null>(null);
  const [tokenRole, setTokenRole] = useState<string | null>(null);
  const [tokenSchoolId, setTokenSchoolId] = useState<string | null>(null);

  const isSchool =
    tokenRole === "school" || profile?.role === "school";

  useEffect(() => {
    if (!user) {
      setTokenRole(null);
      setTokenSchoolId(null);
      return;
    }
    void user.getIdTokenResult().then((result) => {
      setTokenRole(typeof result.claims.role === "string" ? result.claims.role : null);
      setTokenSchoolId(
        typeof result.claims.schoolId === "string" ? result.claims.schoolId : null,
      );
    });
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      void navigate({
        to: "/login",
        search: { redirect: "/school/dashboard" },
      });
      return;
    }
    if (!isSchool) {
      void navigate({ to: "/" });
    }
  }, [authLoading, user, isSchool, navigate]);

  useEffect(() => {
    if (!user || !isSchool) return;

    try {
      const raw = sessionStorage.getItem(SCHOOL_WELCOME_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { code?: string; schoolName?: string };
        if (parsed.code) {
          setWelcomeCode(parsed.code);
          toast.success("Welcome!", {
            description: `School code ${parsed.code}. Share this with students to join.`,
            duration: 8000,
          });
        }
        sessionStorage.removeItem(SCHOOL_WELCOME_STORAGE_KEY);
      }
    } catch {
      /* ignore */
    }

    let active = true;
    void (async () => {
      setLoadingSchool(true);
      try {
        const data = await getSchoolForUser(user.uid, tokenSchoolId);
        if (active) {
          setSchool(data);
          if (data) {
            const imported = await hasSchoolRoster(data.schoolId);
            if (active) setRosterImported(imported);
          }
        }
      } catch (err) {
        console.error(err);
        if (active) toast.error("Could not load your school.");
      } finally {
        if (active) setLoadingSchool(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user, isSchool, tokenSchoolId]);

  if (authLoading || !user || !isSchool) {
    return (
      <div
        className="flex min-h-[100dvh] items-center justify-center"
        style={{ background: "#08080E" }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-[#8B5CF6]" />
      </div>
    );
  }

  const schoolCode = school?.schoolCode ?? welcomeCode ?? "—";
  const isPending = school?.status === "pending" || !school;

  return (
    <div
      className="min-h-[100dvh] px-4 py-8"
      style={{
        background: "#08080E",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        paddingBottom: "max(env(safe-area-inset-bottom), 2rem)",
      }}
    >
      <div className="mx-auto max-w-lg space-y-6">
        <header className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: "rgba(139,92,246,0.2)" }}
          >
            <GraduationCap className="h-5 w-5 text-[#8B5CF6]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">
              {school?.name ?? "School dashboard"}
            </h1>
            <p className="text-xs text-white/55">Aura for schools</p>
          </div>
        </header>

        {loadingSchool ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#8B5CF6]" />
          </div>
        ) : (
          <>
            <section
              className="rounded-2xl border border-[rgba(139,92,246,0.35)] p-6 text-center"
              style={{ background: "rgba(139,92,246,0.08)" }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-white/55">
                Your school code
              </p>
              <p
                className="mt-2 text-3xl font-bold tracking-widest text-[#C4B5FD]"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {schoolCode}
              </p>
              <p className="mt-3 text-sm text-white/70">
                Share this code with Class 10 students so they can join your school on Aura.
              </p>
            </section>

            {isPending ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                Pending approval — we will review your registration within 24 hours.
              </div>
            ) : null}

            {rosterImported === false ? (
              <section
                className="rounded-2xl border border-amber-500/35 p-5"
                style={{ background: "rgba(245,158,11,0.08)" }}
              >
                <p className="text-sm font-medium text-amber-100">
                  Import your class roster to match students for mark entry
                </p>
                <Button
                  asChild
                  className="mt-4 w-full rounded-xl bg-[#8B5CF6] text-white hover:bg-[#7C3AED]"
                >
                  <Link to="/school/roster">
                    <Upload className="mr-2 h-4 w-4" />
                    Import roster
                  </Link>
                </Button>
              </section>
            ) : null}

            <section className="rounded-2xl border border-white/10 bg-[#14141F] p-5">
              <h2 className="text-sm font-semibold text-white">Next steps</h2>
              <ol className="mt-3 space-y-3 text-sm text-white/75">
                <li className="flex gap-2">
                  <span className="font-mono text-[#8B5CF6]">1.</span>
                  Share your school code with students
                </li>
                <li className="flex gap-2">
                  <span className="font-mono text-[#8B5CF6]">2.</span>
                  Share the school login with subject teachers
                </li>
                <li className="flex gap-2">
                  <span className="font-mono text-[#8B5CF6]">3.</span>
                  Import your class roster
                </li>
              </ol>
            </section>

            <section className="space-y-3">
              <Link
                to="/school/roster"
                className="flex items-center justify-between rounded-xl border border-white/10 bg-[#14141F] px-4 py-3 transition-colors hover:border-[#8B5CF6]/40"
              >
                <span className="text-sm text-white/90">Class roster import</span>
                <span className="text-xs text-[#C4B5FD]">
                  {rosterImported ? "Manage" : "Import →"}
                </span>
              </Link>
              <ComingSoonCard title="Marks entry" />
              <ComingSoonCard title="Class analytics" />
            </section>

            {!school ? (
              <Button
                asChild
                className="w-full rounded-xl bg-[#8B5CF6] text-white hover:bg-[#7C3AED]"
              >
                <Link to="/school-setup">Register a school</Link>
              </Button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function ComingSoonCard({ title }: { title: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-xl border border-white/6 px-4 py-3",
        "bg-[#0F0F18] opacity-60",
      )}
    >
      <span className="text-sm text-white/50">{title}</span>
      <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-white/40">
        <Lock className="h-3 w-3" />
        Coming soon
      </span>
    </div>
  );
}
