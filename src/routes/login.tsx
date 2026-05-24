import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { GraduationCap, Mail, Lock, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";

const GUEST_KEY = "aura.guest.v1";
const GUEST_ONBOARDING_KEY = "aura.guest.onboarding.v1";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — VidyaPath SSLC Prep" },
      {
        name: "description",
        content: "Sign in to VidyaPath to sync your SSLC prep across devices.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, loading, signInWithEmail, signUpWithEmail, signInWithGoogle } =
    useAuth();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/" });
  }, [loading, user, navigate]);

  return (
    <div
      className="min-h-[100dvh] w-full overflow-x-hidden bg-background grid place-items-center px-4 py-6 sm:py-10 lg:py-12 kb-safe"
      style={{ paddingTop: "max(env(safe-area-inset-top), 1.5rem)" }}
    >
      <div className="w-full max-w-md rounded-3xl border border-border/60 bg-card p-6 sm:p-8 shadow-card">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl gradient-brand shadow-glow">
            <GraduationCap className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold tracking-tight">
            Welcome to VidyaPath
          </h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Sign in to sync your SSLC prep across devices.
          </p>
        </div>

        <Button
          variant="outline"
          className="mt-8 w-full rounded-xl"
          onClick={async () => {
            try {
              await signInWithGoogle();
              toast.success("Signed in with Google");
            } catch (err) {
              console.error(err);
              toast.error("Google sign-in failed. Please try again.");
            }
          }}
        >
          <GoogleIcon className="mr-2 h-4 w-4" />
          Continue with Google
        </Button>

        <div className="my-4 sm:my-5 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <Tabs defaultValue="signin">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Create account</TabsTrigger>
          </TabsList>
          <TabsContent value="signin" className="mt-4">
            <SignInForm onSubmit={signInWithEmail} />
          </TabsContent>
          <TabsContent value="signup" className="mt-4">
            <SignUpForm onSubmit={signUpWithEmail} />
          </TabsContent>
        </Tabs>

        <p className="mt-5 sm:mt-6 text-center text-xs text-muted-foreground">
          Want to look around first?
        </p>
        <Button
          variant="ghost"
          className="mt-2 w-full rounded-xl"
          onClick={() => {
            try {
              localStorage.setItem(GUEST_KEY, "1");
            } catch {}
            toast.success("Continuing as guest — progress saved on this device");
            // If onboarding was already completed earlier (e.g. first-time
            // visitor finished the flow before landing on /login), skip
            // straight into the app instead of showing onboarding twice.
            let alreadyOnboarded = false;
            try {
              alreadyOnboarded = !!localStorage.getItem(GUEST_ONBOARDING_KEY);
            } catch {}
            navigate({ to: alreadyOnboarded ? "/" : "/onboarding" });
          }}
        >
          Continue as guest
        </Button>
      </div>
    </div>
  );
}

function SignInForm({
  onSubmit,
}: {
  onSubmit: (email: string, password: string) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handle = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onSubmit(email.trim(), password);
      toast.success("Welcome back");
    } catch (err) {
      console.error(err);
      toast.error("Invalid email or password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handle} className="space-y-3">
      <Field
        id="signin-email"
        label="Email"
        icon={<Mail className="h-4 w-4" />}
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
        required
      />
      <Field
        id="signin-password"
        label="Password"
        icon={<Lock className="h-4 w-4" />}
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        required
        minLength={6}
      />
      <div className="flex justify-end">
        <Link
          to="/forgot-password"
          className="text-xs font-medium text-muted-foreground hover:text-foreground underline"
        >
          Forgot password?
        </Link>
      </div>
      <Button type="submit" className="w-full rounded-xl" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

function SignUpForm({
  onSubmit,
}: {
  onSubmit: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handle = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      await onSubmit(email.trim(), password, name.trim() || undefined);
      toast.success("Account created");
    } catch (err) {
      console.error(err);
      toast.error("Could not create account. Try a different email.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handle} className="space-y-3">
      <Field
        id="signup-name"
        label="Name"
        icon={<User className="h-4 w-4" />}
        value={name}
        onChange={setName}
        autoComplete="name"
        maxLength={80}
      />
      <Field
        id="signup-email"
        label="Email"
        icon={<Mail className="h-4 w-4" />}
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
        required
      />
      <Field
        id="signup-password"
        label="Password"
        icon={<Lock className="h-4 w-4" />}
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        required
        minLength={6}
      />
      <Button type="submit" className="w-full rounded-xl" disabled={busy}>
        {busy ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}

function Field({
  id,
  label,
  icon,
  type = "text",
  value,
  onChange,
  ...rest
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  type?: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "id" | "value" | "onChange" | "type"
>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-9 rounded-xl"
          {...rest}
        />
      </div>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.31 0-6-2.74-6-6.1S8.69 6 12 6c1.88 0 3.14.8 3.86 1.48l2.63-2.53C16.93 3.43 14.7 2.5 12 2.5 6.76 2.5 2.5 6.76 2.5 12s4.26 9.5 9.5 9.5c5.48 0 9.1-3.85 9.1-9.27 0-.62-.07-1.1-.16-1.53H12z"
      />
    </svg>
  );
}