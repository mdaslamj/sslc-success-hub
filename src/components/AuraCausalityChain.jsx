import { memo } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Aura Causality Chain — read-only feedback for the adaptive completion loop.
 * Consumes derived engine state; does not own or persist academic data.
 */
function AuraCausalityChain({ chain, onDismiss, className = "" }) {
  if (!chain?.nodes?.length) return null;

  return (
    <section
      className={`rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0A0A12]/95 p-4 sm:p-5 ${className}`}
      aria-live="polite"
      aria-label="Session impact summary"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[rgba(240,240,248,0.55)]">
            Adaptive loop
          </p>
          <p className="mt-1 text-sm leading-snug text-[rgba(240,240,248,0.88)]">
            {chain.summary}
          </p>
        </div>
        {onDismiss && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-[rgba(240,240,248,0.55)] hover:text-foreground"
            onClick={onDismiss}
            aria-label="Dismiss summary"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <ol className="space-y-0">
        {chain.nodes.map((node, index) => {
          const isLast = index === chain.nodes.length - 1;
          return (
            <li key={node.id} className="relative flex gap-3 pb-4 last:pb-0">
              {!isLast && (
                <span
                  className="absolute left-[13px] top-7 bottom-0 w-px bg-[rgba(255,255,255,0.08)]"
                  aria-hidden
                />
              )}
              <span
                className="relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs"
                style={{
                  borderColor: `${node.color}44`,
                  backgroundColor: `${node.color}14`,
                  color: node.color,
                }}
              >
                {node.icon}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-[rgba(240,240,248,0.55)]">
                  {node.label}
                </p>
                <p
                  className="mt-0.5 truncate text-sm font-semibold tabular-nums"
                  style={{ color: node.color }}
                >
                  {node.value}
                </p>
                <p className="mt-0.5 text-xs leading-snug text-[rgba(240,240,248,0.65)]">
                  {node.sub}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function AuraReplanBanner({ message, onViewChanges, onDismiss, className = "" }) {
  if (!message) return null;

  return (
    <div
      className={`mx-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#1a2744] bg-[#080f1e] px-4 py-3 text-sm text-slate-200 ${className}`}
      role="status"
      aria-live="polite"
    >
      <span>{message}</span>
      <div className="flex gap-2">
        {onViewChanges ? (
          <Button type="button" size="sm" variant="secondary" onClick={onViewChanges}>
            View plan
          </Button>
        ) : null}
        {onDismiss ? (
          <Button type="button" size="sm" variant="ghost" onClick={onDismiss}>
            Dismiss
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default memo(AuraCausalityChain);
