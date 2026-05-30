import { Copy, Check, Share2, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { useAuraEngines } from "@/hooks/useAuraEngines";
import { buildParentSummary } from "@/lib/parentSummaryService";
import { buildParentViewUrl, saveParentShare } from "@/lib/parentShareService";

type ShareWithParentCardProps = {
  title?: string;
  description?: string;
  className?: string;
};

export function ShareWithParentCard({
  title = "Share with parent",
  description = "Send a calm progress link — no login required for parents.",
  className,
}: ShareWithParentCardProps) {
  const { user } = useAuth();
  const { profile, projection, momentum } = useAuraEngines();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const createShareLink = async () => {
    if (!user || !profile) return;
    setBusy(true);
    try {
      const summary = buildParentSummary(profile, { projection, momentum });
      await saveParentShare(user.uid, summary);
      const url = buildParentViewUrl(user.uid);
      setShareUrl(url);
      toast.success("Parent link ready — valid for 30 days");
    } catch (err) {
      console.error(err);
      toast.error("Could not create share link");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <section className={className ?? "rounded-3xl bg-card p-5 shadow-soft"}>
      <h3 className="flex items-center gap-1.5 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        <Share2 className="h-3.5 w-3.5" /> {title}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {shareUrl ? (
        <div className="mt-3 space-y-2">
          <Input readOnly value={shareUrl} className="rounded-2xl text-xs" />
          <Button onClick={() => void copy()} variant="outline" className="h-9 w-full rounded-2xl text-xs">
            {copied ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy link"}
          </Button>
        </div>
      ) : (
        <Button
          onClick={() => void createShareLink()}
          disabled={busy || !user || !profile}
          className="press mt-3 h-10 w-full rounded-2xl text-sm"
        >
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating…
            </>
          ) : (
            "Create parent link"
          )}
        </Button>
      )}
    </section>
  );
}
