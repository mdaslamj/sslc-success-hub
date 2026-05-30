import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Copy, GraduationCap, Loader2, MessageCircle } from "lucide-react";
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
import {
  createSchool,
  type CreateSchoolResult,
  SCHOOL_WELCOME_STORAGE_KEY,
} from "@/lib/schoolService";
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
};

function SchoolSetupPage() {
  const navigate = useNavigate();
  const [section, setSection] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [credentials, setCredentials] = useState<CreateSchoolResult | null>(null);

  const patch = useCallback((updates: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  }, []);

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
      default:
        return false;
    }
  }, [section, form]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!sectionValid || submitting) return;

    if (section < 2) {
      setSection((s) => s + 1);
      return;
    }

    setSubmitting(true);
    try {
      const result = await createSchool({
        name: form.schoolName.trim(),
        dise_code: form.diseCode.trim(),
        district: form.district,
        taluk: form.taluk.trim(),
        city: form.city.trim(),
        schoolType: form.schoolType as SchoolType,
        principalName: form.principalName.trim(),
        principalPhone: form.principalPhone.trim(),
        contactEmail: form.principalEmail.trim(),
        totalStudents: Number(form.studentCount),
        status: "pending",
      });

      sessionStorage.setItem(
        WELCOME_STORAGE_KEY,
        JSON.stringify({ code: result.schoolCode, schoolName: form.schoolName.trim() }),
      );

      setCredentials(result);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (credentials) {
    return (
      <SchoolCredentialsSuccess
        credentials={credentials}
        onGoToDashboard={() =>
          void navigate({
            to: "/login",
            search: { redirect: "/school/dashboard" },
          })
        }
      />
    );
  }

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
          {[0, 1, 2].map((i) => (
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
              <Field
                label="Principal email"
                id="principalEmail"
                hint="For Aura outreach only — your school login is created separately"
              >
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
              ) : section < 2 ? (
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

function SchoolCredentialsSuccess({
  credentials,
  onGoToDashboard,
}: {
  credentials: CreateSchoolResult;
  onGoToDashboard: () => void;
}) {
  const credentialText = [
    `School code: ${credentials.schoolCode}`,
    `Login email: ${credentials.schoolEmail}`,
    `Password: ${credentials.tempPassword}`,
  ].join("\n");

  const copyCredentials = async () => {
    try {
      await navigator.clipboard.writeText(credentialText);
      toast.success("Credentials copied to clipboard");
    } catch {
      toast.error("Could not copy — please copy manually");
    }
  };

  const shareWhatsApp = () => {
    const message = [
      "Aura school account credentials:",
      "",
      credentialText,
      "",
      "Save these — they will not be shown again. Share with your subject teachers.",
    ].join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
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
      <div className="mx-auto max-w-lg space-y-6 fade-in">
        <header className="text-center">
          <div
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ background: "rgba(139,92,246,0.2)" }}
          >
            <GraduationCap className="h-6 w-6 text-[#8B5CF6]" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-white">Your school account is ready</h1>
          <p className="mt-2 text-sm text-white/70">
            We will review your registration within 24 hours.
          </p>
        </header>

        <div
          className="rounded-2xl border border-amber-400/40 p-5"
          style={{ background: "rgba(254,243,199,0.12)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-200/80">
            Show once only — save now
          </p>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-white/55">School code</dt>
              <dd
                className="mt-0.5 font-bold tracking-widest text-white"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {credentials.schoolCode}
              </dd>
            </div>
            <div>
              <dt className="text-white/55">Login email</dt>
              <dd
                className="mt-0.5 font-medium text-white"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {credentials.schoolEmail}
              </dd>
            </div>
            <div>
              <dt className="text-white/55">Password</dt>
              <dd
                className="mt-0.5 font-medium text-white"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {credentials.tempPassword}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-white/70">
            Save these credentials — they will not be shown again. Share with your subject
            teachers.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-xl border-white/10 bg-transparent text-white hover:bg-white/5"
            onClick={() => void copyCredentials()}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy credentials
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-xl border-white/10 bg-transparent text-white hover:bg-white/5"
            onClick={shareWhatsApp}
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            WhatsApp share
          </Button>
        </div>

        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          Change this password after first login in Account Settings.
        </p>

        <Button
          type="button"
          className="w-full rounded-xl bg-[#8B5CF6] py-6 text-base font-semibold text-white hover:bg-[#7C3AED]"
          onClick={onGoToDashboard}
        >
          Sign in with school account
        </Button>
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

export { WELCOME_STORAGE_KEY };
