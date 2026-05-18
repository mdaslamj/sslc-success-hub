import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Database, CheckCircle2, AlertTriangle, Loader2, XCircle } from "lucide-react";
import { seedFirestore, fetchSeedStatus } from "@/integrations/firebase/seed";

export const Route = createFileRoute("/seed")({
  head: () => ({
    meta: [{ title: "Seed Firestore — VidyaPath" }],
  }),
  component: SeedPage,
});

function SeedPage() {
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "success"; subjects: number; chapters: number }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  const status = useQuery({
    queryKey: ["seed-status"],
    queryFn: fetchSeedStatus,
    refetchOnWindowFocus: false,
  });

  async function run() {
    setState({ kind: "loading" });
    try {
      const r = await seedFirestore();
      setState({ kind: "success", ...r });
      status.refetch();
    } catch (e) {
      setState({ kind: "error", message: (e as Error).message });
    }
  }

  return (
    <DashboardLayout title="Seed Firestore">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl border border-border/60 bg-card p-8 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-brand text-brand-foreground">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Seed Firestore</h1>
              <p className="text-sm text-muted-foreground">
                One-time push of mock subjects + chapters into your Firebase project.
              </p>
            </div>
          </div>

          <ul className="mt-6 space-y-1.5 text-sm text-muted-foreground">
            <li>• Creates 6 subject documents</li>
            <li>• Creates ~80 chapter documents</li>
            <li>• Initializes <code>users</code> and <code>progress</code> collections</li>
            <li>• Idempotent — safe to re-run</li>
          </ul>

          <div className="mt-6 rounded-2xl border border-border/60 bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Database status
              </div>
              {status.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : status.isError ? (
                <span className="flex items-center gap-1 text-xs text-destructive">
                  <XCircle className="h-3.5 w-3.5" /> Unreachable
                </span>
              ) : status.data?.seeded ? (
                <span className="flex items-center gap-1 text-xs font-medium text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Seeded
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-medium text-warning">
                  <AlertTriangle className="h-3.5 w-3.5" /> Not seeded
                </span>
              )}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Subjects</div>
                <div className="font-display text-xl font-bold">
                  {status.data?.subjects ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Chapters</div>
                <div className="font-display text-xl font-bold">
                  {status.data?.chapters ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Last seeded</div>
                <div className="text-sm font-medium">
                  {status.data?.seededAt
                    ? new Date(status.data.seededAt).toLocaleString()
                    : "—"}
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={run}
            disabled={state.kind === "loading"}
            className="mt-6 rounded-full"
            size="lg"
          >
            {state.kind === "loading" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Seeding…
              </>
            ) : (
              <>Run seed</>
            )}
          </Button>

          {state.kind === "success" && (
            <div className="mt-6 flex items-start gap-2 rounded-2xl border border-success/30 bg-success/5 p-4 text-sm">
              <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
              <div>
                <p className="font-semibold text-success">Done!</p>
                <p className="text-muted-foreground">
                  Wrote {state.subjects} subjects and {state.chapters} chapters.
                </p>
              </div>
            </div>
          )}

          {state.kind === "error" && (
            <div className="mt-6 flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <p className="font-semibold text-destructive">Seed failed</p>
                <p className="text-muted-foreground break-all">{state.message}</p>
                <p className="mt-2 text-muted-foreground">
                  Most common cause: Firestore security rules block writes. In Firebase Console →
                  Firestore → Rules, allow writes temporarily, run this once, then lock down.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}