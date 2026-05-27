import { useAuraEngines } from "@/hooks/useAuraEngines";
import type { AdaptiveMessaging, StudentLearningProfile } from "@/types/aura-engine-contracts";

export type AdaptiveMessageContext =
  | "onLogin"
  | "onStreak"
  | "onRecovery"
  | "onTargetGap"
  | "onMissedDay"
  | "onImprovement"
  | "onPanicDetected";

type AdaptiveMessageProps = {
  context: AdaptiveMessageContext;
};

function getAdaptiveMessaging(profile: StudentLearningProfile): AdaptiveMessaging | undefined {
  const extended = profile as StudentLearningProfile & {
    adaptiveMessaging?: AdaptiveMessaging;
  };
  return profile.adaptiveMsg ?? extended.adaptiveMessaging;
}

function shouldRender(
  context: AdaptiveMessageContext,
  engines: ReturnType<typeof useAuraEngines>,
): boolean {
  const lastSession = engines.profile.sessionHistory.at(-1);

  switch (context) {
    case "onPanicDetected":
      return (
        engines.momentum.trend === "declining" ||
        (engines.momentum.trend as string) === "down" ||
        lastSession?.panicSignal === true
      );
    case "onMissedDay":
      return lastSession?.durationMinutes === 0;
    case "onStreak":
      return engines.momentum.streak >= 3;
    default:
      return true;
  }
}

function replaceTokens(
  template: string,
  engines: ReturnType<typeof useAuraEngines>,
): string {
  const gapPct =
    (engines.target as { gapPct?: number }).gapPct ?? engines.target.gapPercentage;
  const topRecovery = engines.recovery.top3[0];

  return template
    .replace(/\{streak\}/g, String(engines.momentum.streak))
    .replace(/\{gap\}/g, String(gapPct))
    .replace(/\{subject\}/g, topRecovery?.subject ?? "")
    .replace(/\{n\}/g, String(topRecovery?.recoverableMarks ?? ""));
}

export function AdaptiveMessage({ context }: AdaptiveMessageProps) {
  const engines = useAuraEngines();

  if (!shouldRender(context, engines)) {
    return null;
  }

  const messaging = getAdaptiveMessaging(engines.profile);
  const raw = messaging?.contextMessages?.[context];
  if (!raw) {
    return null;
  }

  return (
    <p className="text-[11px] italic text-slate-500">{replaceTokens(raw, engines)}</p>
  );
}
