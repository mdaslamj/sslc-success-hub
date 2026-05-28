import type { AcademicExecutionSnapshot } from "@/core/academic-state";

export type AuraExecutionSystemProps = {
  snapshot: AcademicExecutionSnapshot;
  compact?: boolean;
};

export function AuraExecutionSystem(props: AuraExecutionSystemProps): JSX.Element;
export default AuraExecutionSystem;
