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
  const sessions = engines.profile?.sessionHistory ?? [];
  const lastSession = sessions.at(-1);
  const momentum = engines.momentum;

  if (!momentum) {
    return false;
  }

  switch (context) {
    case "onPanicDetected":
      return (
        momentum.trend === "declining" ||
        (momentum.trend as string) === "down" ||
        lastSession?.panicSignal === true
      );
    case "onMissedDay":
      return lastSession?.durationMinutes === 0;
    case "onStreak":
      return (momentum.streak ?? 0) >= 3;
    default:
      return true;
  }
}

function replaceTokens(
  template: string,
  engines: ReturnType<typeof useAuraEngines>,
): string {
  const gapPct = engines.target?.gapPercentage ?? 0;
  const topRecovery = engines.recovery?.top3?.[0];
  const momentum = engines.momentum;

  return template
    .replace(/\{streak\}/g, String(momentum?.streak ?? 0))
    .replace(/\{gap\}/g, String(gapPct))
    .replace(/\{subject\}/g, topRecovery?.subject ?? "")
    .replace(/\{n\}/g, String(topRecovery?.recoverableMarks ?? ""));
}

export function AdaptiveMessage({ context }: AdaptiveMessageProps) {
  const engines = useAuraEngines();

  if (!engines.profile) {
    return null;
  }

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
