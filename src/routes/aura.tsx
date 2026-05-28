import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy Lovable prototype — redirect to the engine-backed dashboard at `/`. */
export const Route = createFileRoute("/aura")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
