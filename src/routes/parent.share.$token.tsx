import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ParentSummaryView } from "@/components/parent/ParentSummaryView";
import { loadParentShare } from "@/lib/parentShareService";
import type { ParentSummary } from "@/types/parentView";

export const Route = createFileRoute("/parent/share/$token")({
  head: () => ({
    meta: [{ title: "Aura — Student Progress Summary" }],
  }),
  component: ParentSharePage,
});

function ParentSharePage() {
  const { token } = Route.useParams();
  const [summary, setSummary] = useState<ParentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      const doc = await loadParentShare(token);
      if (!active) return;
      if (!doc) {
        setMissing(true);
        setSummary(null);
      } else {
        setSummary(doc.summary);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [token]);

  if (loading) {
    return (
      <ShareShell>
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
      </ShareShell>
    );
  }

  if (missing || !summary) {
    return (
      <ShareShell>
        <h1 className="text-lg font-semibold text-foreground">Link unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This progress link may have expired or been removed.
        </p>
        <Link to="/" className="mt-4 text-sm text-primary underline">
          Go to Aura
        </Link>
      </ShareShell>
    );
  }

  return (
    <ShareShell>
      <div className="mx-auto max-w-md space-y-4 md:max-w-2xl">
        <header className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <p className="mt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Shared progress summary
          </p>
        </header>
        <ParentSummaryView summary={summary} showShareHint />
      </div>
    </ShareShell>
  );
}

function ShareShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background px-4 py-8">
      {children}
    </div>
  );
}
