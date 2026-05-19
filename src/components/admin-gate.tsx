import { useEffect, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, AlertTriangle, Loader2 } from "lucide-react";
import {
  checkAdminUnlocked,
  unlockAdmin,
} from "@/lib/admin-gate.functions";

/**
 * Admin gate, server-validated.
 *
 * The access code is checked inside a server function against the
 * `ADMIN_ACCESS_CODE` runtime secret (never shipped to the client).
 * The unlocked flag is stored in an encrypted HttpOnly cookie via
 * TanStack's `useSession`, so it cannot be flipped from DevTools.
 */
export function AdminGate({ title, children }: { title: string; children: ReactNode }) {
  const check = useServerFn(checkAdminUnlocked);
  const unlock = useServerFn(unlockAdmin);

  const [status, setStatus] = useState<"checking" | "disabled" | "locked" | "unlocked">(
    "checking",
  );
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    check()
      .then((r) => {
        if (cancelled) return;
        if (!r.enabled) setStatus("disabled");
        else setStatus(r.unlocked ? "unlocked" : "locked");
      })
      .catch(() => {
        if (!cancelled) setStatus("disabled");
      });
    return () => {
      cancelled = true;
    };
  }, [check]);

  if (status === "checking") {
    return (
      <DashboardLayout title={title}>
        <div className="mx-auto flex max-w-md items-center justify-center gap-2 rounded-3xl border border-border/60 bg-card p-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking admin session…
        </div>
      </DashboardLayout>
    );
  }

  if (status === "disabled") {
    return (
      <DashboardLayout title={title}>
        <div className="mx-auto max-w-md rounded-3xl border border-destructive/30 bg-destructive/5 p-8 text-sm">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <p className="font-semibold">Admin tools disabled</p>
          </div>
          <p className="mt-2 text-muted-foreground">
            This page is disabled in this deployment. Configure the runtime secrets
            {" "}<code>ADMIN_ACCESS_CODE</code> and <code>ADMIN_SESSION_SECRET</code> to enable it,
            and keep Firestore Security Rules restricting writes to authenticated admins.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (status === "unlocked") return <>{children}</>;

  return (
    <DashboardLayout title={title}>
      <div className="mx-auto max-w-md">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (submitting) return;
            setSubmitting(true);
            setError(null);
            try {
              const r = await unlock({ data: { code } });
              if (!r.enabled) setStatus("disabled");
              else if (r.ok) {
                setStatus("unlocked");
                setCode("");
              } else {
                setError("Incorrect access code.");
              }
            } catch {
              setError("Could not verify the code. Try again.");
            } finally {
              setSubmitting(false);
            }
          }}
          className="rounded-3xl border border-border/60 bg-card p-8 shadow-card"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-brand text-brand-foreground">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Admin access required</h1>
              <p className="text-sm text-muted-foreground">
                Enter the admin access code to continue.
              </p>
            </div>
          </div>
          <Input
            type="password"
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Access code"
            className="mt-6"
            disabled={submitting}
          />
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            className="mt-4 w-full rounded-full"
            size="lg"
            disabled={submitting || code.length === 0}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying…
              </>
            ) : (
              "Unlock"
            )}
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">
            The code is verified server-side and the unlocked state is stored in an
            encrypted HttpOnly cookie. Real protection still lives in Firestore Security
            Rules — keep writes restricted to authenticated admin users.
          </p>
        </form>
      </div>
    </DashboardLayout>
  );
}