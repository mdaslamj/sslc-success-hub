import type { CausalityChain } from "@/core/academic-state/masteryEngine";

export type AuraCausalityChainProps = {
  chain: CausalityChain | null;
  onDismiss?: () => void;
  className?: string;
};

export default function AuraCausalityChain(props: AuraCausalityChainProps): JSX.Element | null;
