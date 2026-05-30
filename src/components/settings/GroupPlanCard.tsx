import { Copy, Loader2, MessageCircle, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import {
  activateGroupSubscription,
  createStudyGroup,
  generateInviteLink,
  getUserGroup,
  leaveStudyGroup,
  type StudyGroup,
} from "@/lib/studyGroupService";

export function GroupPlanCard() {
  const { user } = useAuth();
  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const loadGroup = useCallback(async () => {
    if (!user) {
      setGroup(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getUserGroup(user.uid);
      setGroup(data);
      if (data) {
        setInviteLink(generateInviteLink(data.groupId));
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not load study group");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadGroup();
  }, [loadGroup]);

  const handleCreate = async () => {
    if (!user?.email) return;
    setBusy(true);
    try {
      const groupId = await createStudyGroup(user.uid, user.email);
      const link = generateInviteLink(groupId);
      setInviteLink(link);
      await loadGroup();
      toast.success("Study group created — share the invite link!");
    } catch (err) {
      console.error(err);
      toast.error("Could not create study group");
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Invite link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const handleWhatsApp = () => {
    if (!inviteLink) return;
    const text = `Join my Aura study group! ${inviteLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleActivate = async () => {
    if (!group) return;
    setBusy(true);
    try {
      await activateGroupSubscription(group.groupId);
      await loadGroup();
      toast.success("Subscription activated (Razorpay integration coming soon)");
    } catch (err) {
      console.error(err);
      toast.error("Could not activate subscription");
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async () => {
    if (!group || !user?.email) return;
    setBusy(true);
    try {
      const result = await leaveStudyGroup(group.groupId, user.uid, user.email);
      if (!result.success) {
        toast.error(result.error ?? "Could not leave group");
        return;
      }
      setGroup(null);
      setInviteLink(null);
      toast.success("You left the study group");
    } catch (err) {
      console.error(err);
      toast.error("Could not leave group");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <CardShell>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading group plan…
        </div>
      </CardShell>
    );
  }

  const isAdmin = group && user && group.createdBy === user.uid;
  const isMember = group && user && group.members.includes(user.uid) && !isAdmin;

  if (!group) {
    return (
      <CardShell>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold">Study with friends</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Share Aura with up to 4 friends for Rs.120/student per month
            </p>
            <Button
              className="mt-4 rounded-xl"
              disabled={busy || !user?.email}
              onClick={() => void handleCreate()}
            >
              {busy ? "Creating…" : "Create a group"}
            </Button>
          </div>
        </div>
      </CardShell>
    );
  }

  return (
    <CardShell>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h3 className="text-sm font-semibold">
              {isAdmin ? "Your study group" : "Study group member"}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {group.members.length} of {group.maxMembers} members ·{" "}
              <StatusBadge status={group.status} />
            </p>
          </div>

          {isAdmin && inviteLink ? (
            <InviteActions
              inviteLink={inviteLink}
              onCopy={() => void handleCopy()}
              onWhatsApp={handleWhatsApp}
            />
          ) : null}

          {group.memberEmails && group.memberEmails.length > 0 ? (
            <div className="rounded-xl bg-secondary/30 px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Members
              </p>
              <ul className="mt-1 space-y-1">
                {group.memberEmails.map((email) => (
                  <li key={email} className="truncate text-xs text-foreground/90">
                    {email}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {isAdmin ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="rounded-xl"
                disabled={busy || group.status === "active"}
                onClick={() => void handleActivate()}
              >
                {group.status === "active" ? "Subscription active" : "Activate subscription"}
              </Button>
            </div>
          ) : null}

          {isMember ? (
            <Button
              variant="outline"
              className="rounded-xl text-destructive hover:text-destructive"
              disabled={busy}
              onClick={() => void handleLeave()}
            >
              Leave group
            </Button>
          ) : null}
        </div>
      </div>
    </CardShell>
  );
}

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card p-4">{children}</section>
  );
}

function StatusBadge({ status }: { status: StudyGroup["status"] }) {
  const label =
    status === "active" ? "Active" : status === "pending" ? "Pending payment" : "Inactive";
  const color =
    status === "active"
      ? "text-emerald-600 dark:text-emerald-400"
      : status === "pending"
        ? "text-amber-600 dark:text-amber-400"
        : "text-muted-foreground";
  return <span className={color}>{label}</span>;
}

function InviteActions({
  inviteLink,
  onCopy,
  onWhatsApp,
}: {
  inviteLink: string;
  onCopy: () => void;
  onWhatsApp: () => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Invite link
      </p>
      <div className="flex gap-2">
        <input
          readOnly
          value={inviteLink}
          className="min-w-0 flex-1 truncate rounded-lg border border-border/60 bg-secondary/30 px-2 py-1.5 text-xs"
        />
        <Button type="button" size="icon" variant="outline" className="shrink-0" onClick={onCopy}>
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="shrink-0"
          onClick={onWhatsApp}
        >
          <MessageCircle className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
