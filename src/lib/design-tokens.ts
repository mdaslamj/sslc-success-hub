export const COLORS = {
  bg: "#08080E",
  surface1: "#0F0F18",
  surface2: "#14141F",
  surface3: "#1A1A28",
  border1: "rgba(255,255,255,0.06)",
  border2: "rgba(255,255,255,0.10)",
  text: "#F0F0F8",
  muted: "rgba(240,240,248,0.70)",
  dim: "rgba(240,240,248,0.45)",
  purple: "#8B5CF6",
  purpleDim: "rgba(139,92,246,0.14)",
  green: "#4ADE80",
  amber: "#FBBF24",
  red: "#F87171",
  blue: "#38BDF8",
  orange: "#FB923C",
  pink: "#F472B6",
} as const;

export const SUBJECT_COLORS = {
  science: "#38BDF8",
  math: "#FBBF24",
  social: "#4ADE80",
  english: "#C084FC",
  kannada: "#FB923C",
  hindi: "#F472B6",
} as const;

export const STATUS_COLORS = {
  critical: "#F87171",
  fragile: "#FBBF24",
  recoverable: "#38BDF8",
  stable: "#4ADE80",
  strong: "#C084FC",
} as const;
