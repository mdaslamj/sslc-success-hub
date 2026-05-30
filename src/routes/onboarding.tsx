import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { patchUserProfile } from "@/integrations/firebase/services/users";
import { syncStudentDisplayName } from "@/lib/student-display-name";
import { applyOnboardingToProfile } from "@/lib/emptyStudentProfile";
import {
  loadInitialProfileStorage,
  readStoredProfile,
  stripProfileStorage,
  toProfileStorage,
  writeStoredProfile,
} from "@/hooks/useStudentProfile";
import {
  ConversationalOnboarding,
  type OnboardingMappedState,
} from "@/components/onboarding/ConversationalOnboarding";
import {
  buildWeeklyScheduleFromOnboarding,
  syncWeeklyScheduleToAcademicProfile,
} from "@/lib/availabilityEngine";
import { joinSchoolByCode, PENDING_SCHOOL_JOIN_KEY } from "@/lib/schoolService";
import { toast } from "sonner";

const GUEST_KEY = "aura.guest.v1";
const GUEST_ONBOARDING_KEY = "aura.guest.onboarding.v1";

function isGuest() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(GUEST_KEY) === "1";
}

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Welcome — Project Aura" },
      { name: "description", content: "Set up your personalized AI study plan." },
    ],
  }),
  component: OnboardingFlow,
});

type State = OnboardingMappedState;

function OnboardingFlow() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [s, setS] = useState<State>({
    name: "",
    target: 90,
    weak: [],
    capacity: 90,
    language: "en",
    weekend: "light",
    intensity: "balanced",
  });

  useEffect(() => {
    if (!profile) return;
    setS((p) => ({
      ...p,
      name: profile.studentName || profile.displayName || "",
      target: profile.targetScore ?? 90,
      weak: profile.weakSubjects ?? [],
      capacity: profile.dailyStudyGoalMinutes ?? 90,
      language: profile.preferredLanguage ?? "en",
      weekend: profile.weekendStudy ?? "light",
      intensity: profile.revisionIntensity ?? "balanced",
      examDate: profile.examTargetDate,
    }));
  }, [profile]);

  const finish = async (stateOverride?: State) => {
    const data = stateOverride ?? s;

    if (!user && isGuest()) {
      setSaving(true);
      try {
        loadInitialProfileStorage();
        const weeklySchedule = buildWeeklyScheduleFromOnboarding(
          data.unavailableDays ?? [],
          data.capacity,
        );
        syncWeeklyScheduleToAcademicProfile(weeklySchedule);
        localStorage.setItem(
          GUEST_ONBOARDING_KEY,
          JSON.stringify({ ...data, weeklySchedule, completedAt: Date.now() }),
        );
        syncStudentDisplayName(data.name || "Student");
        if (data.schoolCode?.trim()) {
          sessionStorage.setItem(
            PENDING_SCHOOL_JOIN_KEY,
            JSON.stringify({ code: data.schoolCode.trim() }),
          );
        }
        toast.success("Your plan is ready 🌱");
        navigate({ to: "/plan-reveal" });
      } finally {
        setSaving(false);
      }
      return;
    }
    if (!user) {
      try {
        loadInitialProfileStorage();
        const weeklySchedule = buildWeeklyScheduleFromOnboarding(
          data.unavailableDays ?? [],
          data.capacity,
        );
        syncWeeklyScheduleToAcademicProfile(weeklySchedule);
        localStorage.setItem(
          GUEST_ONBOARDING_KEY,
          JSON.stringify({ ...data, weeklySchedule, completedAt: Date.now() }),
        );
      } catch {}
      navigate({ to: "/login" });
      return;
    }
    setSaving(true);
    try {
      loadInitialProfileStorage();
      const weeklySchedule = buildWeeklyScheduleFromOnboarding(
        data.unavailableDays ?? [],
        data.capacity,
      );
      syncWeeklyScheduleToAcademicProfile(weeklySchedule);

      await patchUserProfile(user.uid, {
        studentName: data.name || profile?.studentName || "Student",
        displayName: data.name || profile?.studentName || "Student",
        targetScore: data.target,
        weakSubjects: data.weak,
        dailyStudyGoalMinutes: data.capacity,
        preferredLanguage: data.language,
        weekendStudy: data.weekend,
        revisionIntensity: data.intensity,
        examTargetDate: data.examDate,
        pricingTier: data.pricingTier ?? "urban",
        weeklySchedule,
        onboardingCompletedAt: Date.now(),
      });
      void seedAdaptiveBaselines(user.uid, data).catch((e) =>
        console.warn("baseline seed failed", e),
      );
      await refreshProfile();
      syncStudentDisplayName(data.name || profile?.studentName || "Student");

      if (data.schoolCode?.trim()) {
        const joinResult = await joinSchoolByCode(
          data.schoolCode.trim(),
          user.uid,
          data.name || profile?.studentName || profile?.displayName,
        );
        if (joinResult.success) {
          await refreshProfile();
          toast.success(`Connected to ${joinResult.school?.name ?? "your school"}`);
        } else if (joinResult.error !== "already_joined") {
          toast.message("School code not found — you can join later from Settings");
        }
      }

      toast.success("Your plan is ready 🌱");
      navigate({ to: "/plan-reveal" });
    } catch (err) {
      console.error(err);
      toast.error("Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = (mapped: State) => {
    setS(mapped);
    void finish(mapped);
  };

  return (
    <ConversationalOnboarding
      defaultName={s.name || profile?.studentName || profile?.displayName}
      saving={saving}
      onComplete={handleComplete}
    />
  );
}

/**
 * Apply onboarding choices to the academic profile — targets and schedule only,
 * never pre-filled mastery or fake readiness scores.
 */
async function seedAdaptiveBaselines(_uid: string, s: State): Promise<void> {
  const stored = readStoredProfile() ?? loadInitialProfileStorage();
  const { profile, masteryReadings } = stripProfileStorage(stored);
  const nextProfile = applyOnboardingToProfile(profile, {
    name: s.name,
    targetScore: s.target,
    weakSubjects: s.weak,
    examDate: s.examDate,
  });
  writeStoredProfile(toProfileStorage(nextProfile, masteryReadings));
}
