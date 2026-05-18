import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Database, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { seedFirestore } from "@/integrations/firebase/seed";

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

  async function run() {
    setState({ kind: "loading" });
    try {
      const r = await seedFirestore();
      setState({ kind: "success", ...r });
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