import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Download, ShieldAlert } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import {
  exportLocalUserData,
  purgeLocalUserData,
  requestAccountDeletion,
} from "@/lib/production/account-lifecycle";

export const Route = createFileRoute("/account/delete")({
  component: AccountDeleteRoute,
  head: () => ({ meta: [{ title: "Delete account — Aura" }] }),
});

function AccountDeleteRoute() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [confirmText, setConfirmText] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    const blob = exportLocalUserData();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aura-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Your data export was downloaded.");
  }

  async function handleDelete() {
    if (!user) return;
    if (confirmText.trim().toLowerCase() !== "delete my account") {
      toast.error('Please type "delete my account" to confirm.');
      return;
    }
    setBusy(true);
    try {
      requestAccountDeletion({
        uid: user.uid,
        email: user.email ?? undefined,
        reason: reason.trim() || undefined,
      });
      purgeLocalUserData();
      await signOut();
      toast.success("Account deletion requested. Local data was cleared.");
      navigate({ to: "/login" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-xl space-y-4 p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Delete your account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              This permanently removes your study history, scans, planner,
              achievements and any linked parent/teacher summaries. You
              cannot undo this.
            </p>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Download my data first
            </Button>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason (optional)</label>
              <Textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Help us understand what went wrong."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Type <span className="font-mono">delete my account</span> to confirm
              </label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="delete my account"
              />
            </div>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={busy}
              className="w-full"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete account
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}