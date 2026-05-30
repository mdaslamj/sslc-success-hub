import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import AuraConstellation from "@/components/AuraConstellation";
import { buildConstellationView } from "@/core/academic-state/constellationView";
import { canonicalSubjectRouteId } from "@/lib/chapter-routes";
import { useAuraEngines } from "@/hooks/useAuraEngines";

export function ProfileConstellationSection() {
  const navigate = useNavigate();
  const { profile, projection, momentum, burnout, isLoading } = useAuraEngines();

  const { subjects, chapters } = useMemo(
    () => buildConstellationView(profile, projection),
    [profile, projection],
  );

  const momentumScore = Math.round(momentum?.score ?? 0);
  const burnoutScore = Math.round(burnout?.score ?? 0);

  if (isLoading) {
    return (
      <div
        className="flex h-[360px] items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#08080E] text-sm text-[rgba(240,240,248,0.70)]"
        aria-busy="true"
      >
        Loading constellation…
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#08080E] p-4 sm:p-5">
      <AuraConstellation
        subjects={subjects}
        chapters={chapters}
        burnoutScore={burnoutScore}
        momentumScore={momentumScore}
        onSubjectTap={(subjectId) =>
          navigate({
            to: "/subjects/$subjectId",
            params: { subjectId: canonicalSubjectRouteId(subjectId) },
          })
        }
      />
    </div>
  );
}
