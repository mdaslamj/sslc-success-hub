import { createFileRoute } from "@tanstack/react-router";
import AuraSystem from "@/features/aura/AuraSystem";

export const Route = createFileRoute("/aura")({
  component: AuraSystem,
});
