import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Phone } from "lucide-react";
import type { SafetyCheckResult } from "@/lib/contentSafety";

type Props = {
  result: SafetyCheckResult;
  onProceed?: () => void;
};

export function SafetyPauseScreen({ result, onProceed }: Props) {
  if (result.action === "escalate") {
    return (
      <div
        className="flex min-h-[100dvh] flex-col items-center justify-center px-6 py-12"
        style={{
          background: "#08080E",
          paddingTop: "max(env(safe-area-inset-top), 2rem)",
          paddingBottom: "max(env(safe-area-inset-bottom), 2rem)",
        }}
      >
        <div className="mx-auto w-full max-w-md space-y-8 text-center">
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Let&apos;s take a moment
            </h1>
            <p className="text-base leading-relaxed text-white/80">
              It looks like you might be going through something difficult right now. Your exam
              preparation can wait — you matter more than any result.
            </p>
          </div>

          <div className="space-y-3 text-left">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-violet-300">
                  <Phone className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">iCall helpline</p>
                  <p className="text-sm text-white/60">9152987821</p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                className="mt-3 w-full bg-[#8B5CF6] text-white hover:bg-[#7C3AED]"
                asChild
              >
                <a href="tel:9152987821">Talk to someone</a>
              </Button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-sm font-semibold text-white">Vandrevala Foundation</p>
              <a
                href="tel:18602662345"
                className="mt-1 block text-sm text-violet-300 hover:underline"
              >
                1860-2662-345
              </a>
              <p className="mt-1 text-xs text-white/50">Available 24/7</p>
            </div>
          </div>

          <p className="text-xs text-white/45">
            Your evaluation has been saved. Come back whenever you are ready.
          </p>
        </div>
      </div>
    );
  }

  if (result.action === "pause") {
    return (
      <div
        className="flex min-h-[100dvh] flex-col items-center justify-center px-6 py-12"
        style={{
          background: "#08080E",
          paddingTop: "max(env(safe-area-inset-top), 2rem)",
          paddingBottom: "max(env(safe-area-inset-bottom), 2rem)",
        }}
      >
        <div className="mx-auto w-full max-w-md space-y-8 text-center">
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              One moment before we continue
            </h1>
            <p className="text-base leading-relaxed text-white/80">
              We noticed some tough feelings in your answers. That is completely normal before
              exams. Take a breath — you have come further than you think.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              type="button"
              size="lg"
              className="w-full rounded-2xl bg-[#8B5CF6] text-white hover:bg-[#7C3AED]"
              onClick={onProceed}
            >
              I&apos;m okay, show my results
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="w-full rounded-2xl border-white/15 bg-transparent text-white hover:bg-white/5"
              asChild
            >
              <Link to="/">I need a break</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
