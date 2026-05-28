import type { CausalityChain } from "@/core/academic-state/masteryEngine";

export type AuraCausalityChainProps = {
  chain: CausalityChain | null;
  onDismiss?: () => void;
  className?: string;
};

export type AuraReplanBannerProps = {
  message: string;
  onViewChanges?: () => void;
  onDismiss?: () => void;
  className?: string;
};

export function AuraReplanBanner(props: AuraReplanBannerProps): JSX.Element | null;

export default function AuraCausalityChain(props: AuraCausalityChainProps): JSX.Element | null;
