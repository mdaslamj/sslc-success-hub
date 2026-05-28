import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import DashboardPage from "@/pages/DashboardPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aura — Project Aura" },
      {
        name: "description",
        content:
          "Engine-backed SSLC readiness dashboard — score projection, recovery priorities, and your next critical mission.",
      },
    ],
  }),
  component: AuraDashboardRoute,
});

function AuraDashboardRoute() {
  return (
    <DashboardLayout title="Aura">
      <div className="-mx-4 -mt-4 mb-0 sm:-mx-5 sm:-mt-5 md:-mx-6 md:-mt-6 md:mb-0">
        <DashboardPage />
      </div>
    </DashboardLayout>
  );
}
