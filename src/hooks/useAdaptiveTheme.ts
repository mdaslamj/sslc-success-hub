import { useMemo } from "react";
import type { Archetype } from "@/types/aura-engine-contracts";

export type AdaptiveTheme = {
  primary: string;
  accent: string;
  dim: string;
  badge: string;
  tone: string;
  layoutDensity: "simple" | "standard" | "advanced";
};

const THEMES: Record<Archetype, AdaptiveTheme> = {
  struggling: {
    primary: "#f97316",
    accent: "#fb923c",
    dim: "#f9731614",
    badge: "RECOVERY MODE",
    tone: "You can still pass strongly.",
    layoutDensity: "simple",
  },
  average: {
    primary: "#3b82f6",
    accent: "#60a5fa",
    dim: "#3b82f614",
    badge: "GROWTH MODE",
    tone: "You are capable of 85+.",
    layoutDensity: "standard",
  },
  topper: {
    primary: "#a855f7",
    accent: "#c084fc",
    dim: "#a855f714",
    badge: "PRECISION MODE",
    tone: "You are within reach of state rank.",
    layoutDensity: "advanced",
  },
};

export function getAdaptiveTheme(archetype: Archetype): AdaptiveTheme {
  return THEMES[archetype];
}

export function useAdaptiveTheme(archetype: Archetype): AdaptiveTheme {
  return useMemo(() => getAdaptiveTheme(archetype), [archetype]);
}
