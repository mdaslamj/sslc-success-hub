import { Component, type ErrorInfo, type ReactNode } from "react";

type AuraErrorBoundaryProps = {
  children: ReactNode;
  sectionName: string;
};

type AuraErrorBoundaryState = {
  hasError: boolean;
};

export class AuraErrorBoundary extends Component<AuraErrorBoundaryProps, AuraErrorBoundaryState> {
  state: AuraErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AuraErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`aura_section_error:${this.props.sectionName}`, error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-[#1a2744] bg-[#080f1e] p-4 text-slate-400">
          <p className="text-sm font-medium text-slate-200">{this.props.sectionName}</p>
          <p className="mt-1 text-xs">Unable to load. Refresh to retry.</p>
        </div>
      );
    }

    return this.props.children;
  }
}
