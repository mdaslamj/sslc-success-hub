import { Component, type ErrorInfo, type ReactNode } from "react";

type AuraErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
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
    console.error("aura_dashboard_error", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div
            className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-2 bg-[#020817] px-4 text-center text-slate-400"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            <p className="text-sm font-medium text-slate-200">Aura dashboard unavailable</p>
            <p className="text-xs">Refresh the page to try again.</p>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
