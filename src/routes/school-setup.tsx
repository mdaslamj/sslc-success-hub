import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { GraduationCap, Loader2 } from "lucide-react";
import { useCallback, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { auth } from "@/integrations/firebase/config";
import { createSchool, SCHOOL_WELCOME_STORAGE_KEY } from "@/lib/schoolService";
import type { SchoolType } from "@/types/school";
import { cn } from "@/lib/utils";

const KARNATAKA_DISTRICTS = [
  "Bagalkot",
  "Ballari",
  "Belagavi",
  "Bengaluru Rural",
  "Bengaluru Urban",
  "Bidar",
  "Chamarajanagar",
  "Chikkaballapur",
  "Chikkamagaluru",
  "Chitradurga",
  "Dakshina Kannada",
  "Davangere",
  "Dharwad",
  "Gadag",
  "Hassan",
  "Haveri",
  "Kalaburagi",
  "Kodagu",
  "Kolar",
  "Koppal",
  "Mandya",
  "Mysuru",
  "Raichur",
  "Ramanagara",
  "Shivamogga",
  "Tumakuru",
  "Udupi",
  "Uttara Kannada",
  "Vijayapura",
  "Yadgir",
] as const;

const SCHOOL_TYPES: { id: SchoolType; label: string }[] = [
  { id: "government", label: "Government School" },
  { id: "private_aided", label: "Private Aided" },
  { id: "private_unaided", label: "Private Unaided" },
];

const WELCOME_STORAGE_KEY = SCHOOL_WELCOME_STORAGE_KEY;

export const Route = createFileRoute("/school-setup")({
  head: () => ({
    meta: [
      { title: "Aura — Register your school" },
      {
        name: "description",
        content: "Register your Karnataka SSLC school for the Aura pilot programme.",
      },
    ],
  }),
  component: SchoolSetupPage,
});

type FormState = {
  schoolName: string;
  diseCode: string;
  schoolType: SchoolType | "";
  district: string;
  taluk: string;
  city: string;
  principalName: string;
  principalEmail: string;
  principalPhone: string;
  studentCount: string;
  adminPassword: string;
};

const INITIAL: FormState = {
  schoolName: "",
  diseCode: "",
  schoolType: "",
  district: "",
  taluk: "",
  city: "",
  principalName: "",
  principalEmail: "",
  principalPhone: "",
  studentCount: "",
  adminPassword: "",
};

function SchoolSetupPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signUpWithEmail, signInWithGoogle } = useAuth();
  const [section, setSection] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);

  const patch = useCallback((updates: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  }, []);

  const adminEmail = user?.email ?? form.principalEmail.trim();

  const sectionValid = useMemo(() => {
    switch (section) {
      case 0:
        return (
          form.schoolName.trim().length >= 2 &&
          /^\d{11}$/.test(form.diseCode.trim()) &&
          form.schoolType !== ""
        );
      case 1:
        return form.district !== "" && form.taluk.trim().length >= 2 && form.city.trim().length >= 2;
      case 2:
        return (
          form.principalName.trim().length >= 2 &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.principalEmail.trim()) &&
          form.principalPhone.trim().length >= 10 &&
          Number(form.studentCount) > 0
        );
      case 3:
        if (user) return true;
        return form.adminPassword.length >= 6;
      default:
        return false;
    }
  }, [section, form, user]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!sectionValid || submitting) return;

    if (section < 3) {
      setSection((s) => s + 1);
      return;
    }

    setSubmitting(true);
    try {
      let uid = user?.uid;
      let email = adminEmail;

      if (!uid) {
        email = form.principalEmail.trim();
        await signUpWithEmail(email, form.adminPassword, form.principalName.trim());
        uid = auth.currentUser?.uid;
        if (!uid) {
          throw new Error("Account created but session not ready. Please sign in and try again.");
        }
      }

      const { schoolCode } = await createSchool({
        name: form.schoolName.trim(),
        dise_code: form.diseCode.trim(),
        district: form.district,
        taluk: form.taluk.trim(),
        city: form.city.trim(),
        schoolType: form.schoolType as SchoolType,
        principalName: form.principalName.trim(),
        principalPhone: form.principalPhone.trim(),
        adminEmail: email,
        adminUid: uid,
        totalStudents: Number(form.studentCount),
        status: "pending",
      });

      sessionStorage.setItem(
        WELCOME_STORAGE_KEY,
        JSON.stringify({ code: schoolCode, schoolName: form.schoolName.trim() }),
      );

      toast.success("School registered!", {
        description: `Your school code is ${schoolCode}. We will review within 24 hours.`,
      });

      void navigate({ to: "/school/dashboard" });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-[100dvh] px-4 py-8"
      style={{
        background: "#08080E",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        paddingBottom: "max(env(safe-area-inset-bottom), 2rem)",
      }}
    >
      <div className="mx-auto max-w-lg">
        <header className="mb-8 text-center">
          <div
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ background: "rgba(139,92,246,0.2)" }}
          >
            <GraduationCap className="h-6 w-6 text-[#8B5CF6]" />
          </div>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-[#8B5CF6]">Aura</p>
          <h1 className="mt-2 text-2xl font-bold text-white">Register your school</h1>
          <p className="mt-1 text-sm text-white/70">Join the Karnataka SSLC pilot programme</p>
          <p className="mt-2 text-xs text-white/55">
            Free for 3 months · No credit card needed
          </p>
        </header>

        <div className="mb-6 flex justify-center gap-2">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                i <= section ? "bg-[#8B5CF6]" : "bg-white/15",
              )}
            />
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {section === 0 && (
            <section className="space-y-4 fade-in">
              <h2 className="text-sm font-semibold text-white">School details</h2>
              <Field label="School name" id="schoolName">
                <Input
                  id="schoolName"
                  value={form.schoolName}
                  onChange={(e) => patch({ schoolName: e.target.value })}
                  className="rounded-xl border-white/10 bg-[#14141F] text-white"
                  placeholder="e.g. Government High School, Mysuru"
                />
              </Field>
              <Field
                label="DISE code"
                id="diseCode"
                hint="Find your DISE code at schoolreportcards.nic.in"
              >
                <Input
                  id="diseCode"
                  inputMode="numeric"
                  maxLength={11}
                  value={form.diseCode}
                  onChange={(e) => patch({ diseCode: e.target.value.replace(/\D/g, "") })}
                  className="rounded-xl border-white/10 bg-[#14141F] text-white"
                  placeholder="11-digit code"
                />
              </Field>
              <div className="space-y-2">
                <Label className="text-xs text-white/70">School type</Label>
                <div className="grid gap-2">
                  {SCHOOL_TYPES.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => patch({ schoolType: opt.id })}
                      className={cn(
                        "rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors",
                        form.schoolType === opt.id
                          ? "border border-[#8B5CF6] bg-[rgba(139,92,246,0.12)] text-[#C4B5FD]"
                          : "border border-white/10 bg-[#14141F] text-white/90 hover:border-white/20",
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {section === 1 && (
            <section className="space-y-4 fade-in">
              <h2 className="text-sm font-semibold text-white">Location</h2>
              <Field label="District" id="district">
                <Select value={form.district} onValueChange={(v) => patch({ district: v })}>
                  <SelectTrigger
                    id="district"
                    className="rounded-xl border-white/10 bg-[#14141F] text-white"
                  >
                    <SelectValue placeholder="Select district" />
                  </SelectTrigger>
                  <SelectContent>
                    {KARNATAKA_DISTRICTS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Taluk" id="taluk">
                <Input
                  id="taluk"
                  value={form.taluk}
                  onChange={(e) => patch({ taluk: e.target.value })}
                  className="rounded-xl border-white/10 bg-[#14141F] text-white"
                />
              </Field>
              <Field label="City / Town" id="city">
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => patch({ city: e.target.value })}
                  className="rounded-xl border-white/10 bg-[#14141F] text-white"
                />
              </Field>
            </section>
          )}

          {section === 2 && (
            <section className="space-y-4 fade-in">
              <h2 className="text-sm font-semibold text-white">Contact</h2>
              <Field label="Principal name" id="principalName">
                <Input
                  id="principalName"
                  value={form.principalName}
                  onChange={(e) => patch({ principalName: e.target.value })}
                  className="rounded-xl border-white/10 bg-[#14141F] text-white"
                />
              </Field>
              <Field label="Principal email" id="principalEmail" hint="Becomes your admin account">
                <Input
                  id="principalEmail"
                  type="email"
                  value={form.principalEmail}
                  onChange={(e) => patch({ principalEmail: e.target.value })}
                  className="rounded-xl border-white/10 bg-[#14141F] text-white"
                />
              </Field>
              <Field label="Principal phone" id="principalPhone">
                <Input
                  id="principalPhone"
                  type="tel"
                  value={form.principalPhone}
                  onChange={(e) => patch({ principalPhone: e.target.value })}
                  className="rounded-xl border-white/10 bg-[#14141F] text-white"
                />
              </Field>
              <Field label="Approximate Class 10 student count" id="studentCount">
                <Input
                  id="studentCount"
                  type="number"
                  min={1}
                  value={form.studentCount}
                  onChange={(e) => patch({ studentCount: e.target.value })}
                  className="rounded-xl border-white/10 bg-[#14141F] text-white"
                  placeholder="e.g. 120"
                />
              </Field>
            </section>
          )}

          {section === 3 && (
            <section className="space-y-4 fade-in">
              <h2 className="text-sm font-semibold text-white">Admin account</h2>
              {authLoading ? (
                <p className="text-sm text-white/60">Checking sign-in status…</p>
              ) : user ? (
                <div
                  className="rounded-xl border border-white/10 bg-[#14141F] px-4 py-3 text-sm text-white/80"
                >
                  <p>Signed in as</p>
                  <p className="mt-1 font-medium text-white">{user.email}</p>
                  <p className="mt-2 text-xs text-white/55">You will be the school admin</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-white/70">Create your admin account</p>
                  <Field label="Email" id="adminEmail">
                    <Input
                      id="adminEmail"
                      type="email"
                      value={form.principalEmail}
                      readOnly
                      className="rounded-xl border-white/10 bg-[#14141F] text-white/70"
                    />
                  </Field>
                  <Field label="Password" id="adminPassword">
                    <Input
                      id="adminPassword"
                      type="password"
                      minLength={6}
                      value={form.adminPassword}
                      onChange={(e) => patch({ adminPassword: e.target.value })}
                      className="rounded-xl border-white/10 bg-[#14141F] text-white"
                      placeholder="At least 6 characters"
                    />
                  </Field>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl border-white/10 bg-transparent text-white hover:bg-white/5"
                    onClick={async () => {
                      try {
                        await signInWithGoogle();
                        toast.success("Signed in with Google");
                      } catch {
                        toast.error("Google sign-in failed. Please try again.");
                      }
                    }}
                  >
                    <GoogleIcon className="mr-2 h-4 w-4" />
                    Sign in with Google
                  </Button>
                </>
              )}
            </section>
          )}

          <div className="flex gap-3 pt-2">
            {section > 0 ? (
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-xl border-white/10 bg-transparent text-white"
                onClick={() => setSection((s) => s - 1)}
                disabled={submitting}
              >
                Back
              </Button>
            ) : null}
            <Button
              type="submit"
              disabled={!sectionValid || submitting}
              className={cn(
                "rounded-xl bg-[#8B5CF6] py-6 text-base font-semibold text-white hover:bg-[#7C3AED]",
                section > 0 ? "flex-1" : "w-full",
              )}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering…
                </>
              ) : section < 3 ? (
                "Continue →"
              ) : (
                "Register school →"
              )}
            </Button>
          </div>
        </form>
      </div>

      <style>{`
        .fade-in { animation: fadeIn 0.35s ease-out; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  id,
  hint,
  children,
}: {
  label: string;
  id: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-white/70">
        {label}
      </Label>
      {children}
      {hint ? <p className="text-[11px] text-white/55">{hint}</p> : null}
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

export { WELCOME_STORAGE_KEY };