import { useState, type ReactNode } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, AlertTriangle } from "lucide-react";

const STORAGE_KEY = "vp.admin.unlocked";

function getExpectedCode(): string | undefined {
  // Build-time env. If unset, admin pages are fully disabled in this build.
  return import.meta.env.VITE_ADMIN_ACCESS_CODE as string | undefined;
}

export function AdminGate({ title, children }: { title: string; children: ReactNode }) {
  const expected = getExpectedCode();
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  });
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!expected) {
    return (
      <DashboardLayout title={title}>
        <div className="mx-auto max-w-md rounded-3xl border border-destructive/30 bg-destructive/5 p-8 text-sm">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <p className="font-semibold">Admin tools disabled</p>
          </div>
          <p className="mt-2 text-muted-foreground">
            This page is disabled in this deployment. Set <code>VITE_ADMIN_ACCESS_CODE</code> at
            build time to enable it, and configure Firestore Security Rules so writes require an
            authenticated admin.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (unlocked) return <>{children}</>;

  return (
    <DashboardLayout title={title}>
      <div className="mx-auto max-w-md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (code === expected) {
              sessionStorage.setItem(STORAGE_KEY, "1");
              setUnlocked(true);
              setError(null);
            } else {
              setError("Incorrect access code.");
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
          />
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          <Button type="submit" className="mt-4 w-full rounded-full" size="lg">
            Unlock
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">
            Note: this gate is defence-in-depth only. Real protection lives in Firestore Security
            Rules — restrict writes to authenticated admin users there.
          </p>
        </form>
      </div>
    </DashboardLayout>
  );
}