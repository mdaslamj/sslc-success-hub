import { cn } from "@/lib/utils";

export type VoiceOrbState = "idle" | "listening" | "thinking" | "speaking";

/**
 * Animated microphone "orb" — central visual for the voice tutor. Pulse
 * speed scales with state so the student gets continuous feedback without
 * any cognitive load. Pure CSS, no canvas — battery-friendly.
 */
export function VoiceOrb({
  state,
  size = 132,
  className,
}: {
  state: VoiceOrbState;
  size?: number;
  className?: string;
}) {
  const colorClass =
    state === "listening"
      ? "from-primary via-primary/70 to-primary/40"
      : state === "thinking"
        ? "from-amber-400 via-amber-300/70 to-amber-200/40"
        : state === "speaking"
          ? "from-emerald-400 via-emerald-300/70 to-emerald-200/40"
          : "from-muted-foreground/40 via-muted-foreground/20 to-muted-foreground/10";

  const ringAnim =
    state === "listening" || state === "speaking"
      ? "animate-ping"
      : state === "thinking"
        ? "animate-pulse"
        : "";

  return (
    <div
      className={cn("relative flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span
        className={cn(
          "absolute inset-0 rounded-full bg-gradient-to-br opacity-50 blur-xl",
          colorClass,
        )}
      />
      {state !== "idle" ? (
        <>
          <span
            className={cn(
              "absolute inset-2 rounded-full border border-current opacity-30",
              colorClass.includes("primary") && "text-primary",
              colorClass.includes("amber") && "text-amber-400",
              colorClass.includes("emerald") && "text-emerald-400",
              ringAnim,
            )}
          />
          <span
            className={cn(
              "absolute inset-6 rounded-full border border-current opacity-50",
              colorClass.includes("primary") && "text-primary",
              colorClass.includes("amber") && "text-amber-400",
              colorClass.includes("emerald") && "text-emerald-400",
            )}
          />
        </>
      ) : null}
      <span
        className={cn(
          "relative h-1/2 w-1/2 rounded-full bg-gradient-to-br shadow-xl",
          colorClass,
        )}
      />
    </div>
  );
}

/**
 * Bar-style waveform — used as a compact inline status indicator (e.g.
 * inside a chat row). Independent from the orb so callers can mix the two.
 */
export function VoiceWaveform({
  active,
  className,
}: {
  active: boolean;
  className?: string;
}) {
  const bars = [4, 7, 10, 7, 4];
  return (
    <div className={cn("flex h-4 items-end gap-0.5", className)} aria-hidden>
      {bars.map((h, i) => (
        <span
          key={i}
          className={cn(
            "w-0.5 rounded-full bg-current transition-all",
            active ? "animate-pulse" : "opacity-30",
          )}
          style={{ height: `${h * (active ? 1 : 0.6)}px`, animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}