import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GraduationCap, Loader2, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import {
  getStudyGroupById,
  joinStudyGroup,
  type StudyGroup,
} from "@/lib/studyGroupService";

const searchSchema = z.object({
  id: z.string().optional(),
});

export const Route = createFileRoute("/join-group")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [{ title: "Aura — Join Study Group" }],
  }),
  component: JoinGroupPage,
});

function JoinGroupPage() {
  const { id: groupId } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [loadingGroup, setLoadingGroup] = useState(true);
  const [joining, setJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId || !user) {
      setLoadingGroup(false);
      return;
    }

    let active = true;
    void (async () => {
      setLoadingGroup(true);
      try {
        const data = await getStudyGroupById(groupId);
        if (active) setGroup(data);
      } catch (err) {
        console.error(err);
        if (active) setErrorMessage("Could not load group details.");
      } finally {
        if (active) setLoadingGroup(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [groupId, user]);

  const loginRedirect = groupId
    ? `/login?redirect=${encodeURIComponent(`/join-group?id=${groupId}`)}`
    : "/login";

  const handleJoin = useCallback(async () => {
    if (!groupId || !user?.email) return;
    setJoining(true);
    setErrorMessage(null);
    try {
      const result = await joinStudyGroup(groupId, user.uid, user.email);
      if (!result.success) {
        setErrorMessage(mapJoinError(result.error));
        return;
      }
      toast.success("You joined the study group!");
      void navigate({ to: "/" });
    } catch (err) {
      console.error(err);
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setJoining(false);
    }
  }, [groupId, navigate, user]);

  if (!groupId) {
    return (
      <InviteShell>
        <p className="text-sm text-white/70">Invalid invite link — no group id found.</p>
      </InviteShell>
    );
  }

  return (
    <InviteShell>
      <p className="text-sm text-white/70">
        You have been invited to join a study group
      </p>

      <div
        className="mt-6 w-full rounded-2xl border p-4 text-left"
        style={{ borderColor: "rgba(255,255,255,0.08)", background: "#0F0F18" }}
      >
        <div className="flex items-center gap-2 text-white/90">
          <Users className="h-4 w-4 text-[#8B5CF6]" />
          <span className="text-sm font-medium">Aura Group Plan</span>
        </div>

        {authLoading || (user && loadingGroup) ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-white/60">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading group…
          </div>
        ) : group ? (
          <p className="mt-3 text-sm text-white/80">
            {group.members.length} of {group.maxMembers} members
          </p>
        ) : user ? (
          <p className="mt-3 text-sm text-white/60">
            Sign in to view group details and join.
          </p>
        ) : null}

        <p className="mt-4 text-sm leading-relaxed text-white/70">
          Rs.599/month split 5 ways ={" "}
          <span className="font-semibold text-[#4ADE80]">Rs.120/student</span>
        </p>
      </div>

      {errorMessage ? (
        <p className="mt-4 text-sm text-[#F87171]">{errorMessage}</p>
      ) : null}

      <div className="mt-6 w-full space-y-3">
        {!user ? (
          <Button
            className="w-full rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED]"
            onClick={() => {
              window.location.href = loginRedirect;
            }}
          >
            Sign in to join this group
          </Button>
        ) : (
          <Button
            className="w-full rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED]"
            disabled={joining}
            onClick={() => void handleJoin()}
          >
            {joining ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Joining…
              </>
            ) : (
              "Join this group"
            )}
          </Button>
        )}
      </div>
    </InviteShell>
  );
}

function InviteShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-[100dvh] items-center justify-center px-4 py-8"
      style={{
        background: "#08080E",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#8B5CF6]/20">
          <GraduationCap className="h-7 w-7 text-[#8B5CF6]" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-white">Aura</h1>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

function mapJoinError(error?: string): string {
  if (!error) return "Could not join this group.";
  if (error.includes("full")) {
    return "This group is full. Ask your friend to create a new group.";
  }
  if (error.includes("not active")) {
    return "The group admin hasn't activated the subscription yet.";
  }
  if (error.includes("Already")) {
    return "You are already in this group.";
  }
  if (error.includes("not found")) {
    return "This invite link is invalid or expired.";
  }
  return error;
}
