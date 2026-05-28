import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { FirebaseError } from "firebase/app";
import { GraduationCap, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Aura — Reset Password" },
      {
        name: "description",
        content: "Reset your Aura account password via email.",
      },
    ],
  }),
  component: ForgotPasswordPage,
});

function mapError(code: string): string {
  switch (code) {
    case "auth/invalid-email":
      return "That email address looks invalid. Please check and try again.";
    case "auth/missing-email":
      return "Please enter your email address.";
    case "auth/user-not-found":
      // Don't reveal whether an account exists — show generic success instead.
      return "";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a few minutes and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return "Could not send reset email. Please try again.";
  }
}

function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await sendPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      console.error(err);
      if (err instanceof FirebaseError) {
        const msg = mapError(err.code);
        if (msg === "") {
          // Treat unknown-user as success to avoid email enumeration.
          setSent(true);
        } else {
          setError(msg);
        }
      } else {
        setError("Could not send reset email. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full overflow-x-hidden bg-background grid place-items-center px-4 py-10 kb-safe">
      <div className="w-full max-w-md rounded-3xl border border-border/60 bg-card p-8 shadow-card">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-brand shadow-glow">
            <GraduationCap className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">
            Reset your password
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {sent
              ? "Check your inbox for a reset link."
              : "Enter your email and we'll send you a link to set a new password."}
          </p>
        </div>

        {sent ? (
          <div className="mt-6 space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/40 p-4 text-sm">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-medium text-foreground">Email sent</p>
                <p className="mt-1 text-muted-foreground">
                  If an account exists for{" "}
                  <span className="font-medium text-foreground">{email}</span>,
                  you'll receive a password reset link shortly. The link expires
                  in 1 hour.
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Didn't get it? Check your spam folder, or{" "}
              <button
                type="button"
                className="font-medium text-foreground underline"
                onClick={() => {
                  setSent(false);
                  setError(null);
                }}
              >
                try a different email
              </button>
              .
            </p>
            <Button asChild variant="outline" className="w-full rounded-xl">
              <Link to="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to sign in
              </Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handle} className="mt-6 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="reset-email" className="text-xs">
                Email
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                </span>
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 rounded-xl"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {error ? (
              <p
                role="alert"
                className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
              >
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              className="w-full rounded-xl"
              disabled={busy || email.trim().length === 0}
            >
              {busy ? "Sending…" : "Send reset link"}
            </Button>

            <Button asChild variant="ghost" className="w-full rounded-xl">
              <Link to="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to sign in
              </Link>
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}