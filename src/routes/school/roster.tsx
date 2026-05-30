import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, GraduationCap, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  matchRosterToStudents,
  parseRosterFile,
  RosterPreviewStep,
  RosterUploadStep,
  type RosterMatchRow,
} from "@/components/school/RosterImporter";
import { useAuth } from "@/contexts/auth-context";
import {
  getSchoolForUser,
  getSchoolStudents,
  saveRoster,
} from "@/lib/schoolService";
import type { School, SchoolStudent } from "@/types/school";

export const Route = createFileRoute("/school/roster")({
  head: () => ({
    meta: [{ title: "Aura — Import class roster" }],
  }),
  component: SchoolRosterPage,
});

type Phase = "upload" | "preview" | "complete";

function SchoolRosterPage() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [tokenRole, setTokenRole] = useState<string | null>(null);
  const [tokenSchoolId, setTokenSchoolId] = useState<string | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [loadingSchool, setLoadingSchool] = useState(true);
  const [phase, setPhase] = useState<Phase>("upload");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [matches, setMatches] = useState<RosterMatchRow[]>([]);
  const [schoolStudents, setSchoolStudents] = useState<SchoolStudent[]>([]);
  const [savedCount, setSavedCount] = useState(0);

  const isSchool = tokenRole === "school" || profile?.role === "school";

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
        search: { redirect: "/school/roster" },
      });
      return;
    }
    if (!isSchool) {
      void navigate({ to: "/" });
    }
  }, [authLoading, user, isSchool, navigate]);

  useEffect(() => {
    if (!user || !isSchool) return;
    let active = true;
    void (async () => {
      setLoadingSchool(true);
      try {
        const data = await getSchoolForUser(user.uid, tokenSchoolId);
        if (!active) return;
        setSchool(data);
        if (data) {
          const students = await getSchoolStudents(data.schoolId);
          if (active) setSchoolStudents(students);
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

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!school) return;
      setParsing(true);
      try {
        const rows = await parseRosterFile(file);
        if (rows.length === 0) {
          toast.error("No student rows found in that file.");
          return;
        }
        const matched = await matchRosterToStudents(school.schoolId, rows);
        setMatches(matched);
        setPhase("preview");
      } catch (err) {
        console.error(err);
        toast.error(err instanceof Error ? err.message : "Could not read that file.");
      } finally {
        setParsing(false);
      }
    },
    [school],
  );

  const handleChangeMatch = useCallback(
    (rollNumber: string, auraUid: string | null, auraName: string | null) => {
      setMatches((prev) =>
        prev.map((row) =>
          row.rollNumber === rollNumber
            ? { ...row, auraUid, auraName, confirmed: Boolean(auraUid) }
            : row,
        ),
      );
    },
    [],
  );

  const handleSave = async (_skipUnmatched: boolean) => {
    if (!school) return;
    setSaving(true);
    try {
      const count = await saveRoster(
        school.schoolId,
        matches.map((m) => ({
          rollNumber: m.rollNumber,
          studentName: m.csvName,
          auraUid: m.auraUid,
          confirmed: m.confirmed,
        })),
      );
      setSavedCount(count);
      setPhase("complete");
      toast.success(`Roster saved — ${count} students matched`);
    } catch (err) {
      console.error(err);
      toast.error("Could not save roster. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user || !isSchool || loadingSchool) {
    return (
      <div
        className="flex min-h-[100dvh] items-center justify-center"
        style={{ background: "#08080E" }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-[#8B5CF6]" />
      </div>
    );
  }

  if (!school) {
    return (
      <div
        className="min-h-[100dvh] px-4 py-8"
        style={{ background: "#08080E", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        <div className="mx-auto max-w-lg text-center text-white">
          <p className="text-sm text-white/70">School not found for this account.</p>
          <Button asChild className="mt-4">
            <Link to="/school/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-[100dvh] px-4 py-8"
      style={{
        background: "#08080E",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        paddingBottom: "max(env(safe-area-inset-bottom), 2rem)",
      }}
    >
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="space-y-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1 px-0 text-white/60 hover:bg-transparent hover:text-white"
            onClick={() => void navigate({ to: "/school/dashboard" })}
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Button>
          <div className="flex items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: "rgba(139,92,246,0.2)" }}
            >
              <GraduationCap className="h-5 w-5 text-[#8B5CF6]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Import class roster</h1>
              <p className="mt-1 text-sm text-white/70">
                Do this once — it maps your students to their Aura accounts
              </p>
            </div>
          </div>
        </header>

        {phase === "upload" ? (
          <RosterUploadStep parsing={parsing} onFileSelect={(f) => void handleFileSelect(f)} />
        ) : null}

        {phase === "preview" ? (
          <RosterPreviewStep
            schoolCode={school.schoolCode}
            matches={matches}
            schoolStudents={schoolStudents}
            saving={saving}
            onChangeMatch={handleChangeMatch}
            onSave={(skip) => void handleSave(skip)}
          />
        ) : null}

        {phase === "complete" ? (
          <div className="fade-in space-y-6 text-center">
            <div className="rounded-2xl border border-green-500/30 bg-green-500/10 px-6 py-8">
              <h2 className="text-xl font-bold text-white">
                Roster saved — {savedCount} students matched
              </h2>
              <p className="mt-3 text-sm text-white/70">
                Unmatched students will appear automatically when they join with your school code
              </p>
            </div>
            <Button
              asChild
              className="w-full rounded-xl bg-[#8B5CF6] py-6 text-base font-semibold text-white hover:bg-[#7C3AED]"
            >
              <Link to="/school/dashboard">Go to dashboard</Link>
            </Button>
          </div>
        ) : null}
      </div>

      <style>{`
        .fade-in { animation: fadeIn 0.35s ease-out; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
