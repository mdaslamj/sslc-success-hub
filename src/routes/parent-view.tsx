import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { ParentSummaryView } from "@/components/parent/ParentSummaryView";
import { useAuthOptional } from "@/contexts/auth-context";
import { useAuraEngines } from "@/hooks/useAuraEngines";
import {
  buildDemoParentSummary,
  buildParentSummary,
} from "@/lib/parentSummaryService";
import { loadLatestParentShareForStudent } from "@/lib/parentShareService";
import type { ParentSummary } from "@/types/parentView";

type ParentViewSearch = {
  id?: string;
};

export const Route = createFileRoute("/parent-view")({
  validateSearch: (search: Record<string, unknown>): ParentViewSearch => ({
    id: typeof search.id === "string" && search.id.trim() ? search.id.trim() : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Aura — Student Progress Summary" },
      {
        name: "description",
        content: "A calm, parent-friendly view of SSLC study progress — no login required.",
      },
    ],
  }),
  component: ParentViewPage,
});

function ParentViewPage() {
  const { id: studentIdParam } = Route.useSearch();
  const auth = useAuthOptional();
  const user = auth?.user ?? null;
  const engines = useAuraEngines();
  const { profile, projection, momentum, isLoading: enginesLoading } = engines;

  const targetStudentId = studentIdParam ?? user?.uid;
  const isOwner = Boolean(user?.uid && targetStudentId && user.uid === targetStudentId);

  const [sharedSummary, setSharedSummary] = useState<ParentSummary | null>(null);
  const [shareLoading, setShareLoading] = useState(Boolean(studentIdParam && !isOwner));
  const [usedDemo, setUsedDemo] = useState(false);

  const liveSummary = useMemo(() => {
    if (!isOwner || !profile) return null;
    return buildParentSummary(profile, { projection, momentum });
  }, [isOwner, profile, projection, momentum]);

  useEffect(() => {
    if (!studentIdParam || isOwner) {
      setShareLoading(false);
      return;
    }

    let active = true;
    void (async () => {
      setShareLoading(true);
      const doc = await loadLatestParentShareForStudent(studentIdParam);
      if (!active) return;
      if (doc?.summary) {
        setSharedSummary(doc.summary);
        setUsedDemo(false);
      } else {
        setSharedSummary(buildDemoParentSummary("Your child"));
        setUsedDemo(true);
      }
      setShareLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [studentIdParam, isOwner]);

  const loading = (isOwner && enginesLoading) || shareLoading;

  let summary: ParentSummary | null = null;
  let banner: string | null = null;

  if (studentIdParam) {
    if (isOwner) {
      summary = liveSummary;
    } else {
      summary = sharedSummary;
      if (usedDemo) {
        banner =
          "We couldn't load a saved summary for this link. Ask your child to create a fresh share link from their Aura profile.";
      }
    }
  } else if (user) {
    summary = liveSummary;
    if (!summary && !enginesLoading) {
      summary = buildDemoParentSummary(auth?.profile?.studentName ?? "Your child");
      banner = "Your live summary will appear here once your study profile is ready.";
    }
  } else {
    summary = buildDemoParentSummary("Your child");
    banner = "Ask your child to share their progress link from Aura.";
  }

  if (loading) {
    return (
      <ViewShell>
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      </ViewShell>
    );
  }

  if (!summary) {
    return (
      <ViewShell>
        <h1 className="text-lg font-semibold text-foreground">Summary unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ask your child to share an updated progress link from their Aura profile.
        </p>
        <Link to="/" className="mt-4 text-sm text-primary underline">
          Go to Aura
        </Link>
      </ViewShell>
    );
  }

  return (
    <ViewShell>
      <div className="mx-auto max-w-md space-y-4 md:max-w-2xl">
        <header className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <p className="mt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {isOwner ? "Your progress summary" : "Shared progress summary"}
          </p>
        </header>

        {banner ? (
          <p className="rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 text-center text-sm text-muted-foreground">
            {banner}
          </p>
        ) : null}

        <ParentSummaryView summary={summary} showShareHint={!isOwner} />
      </div>
    </ViewShell>
  );
}

function ViewShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background px-4 py-8">
      {children}
    </div>
  );
}
