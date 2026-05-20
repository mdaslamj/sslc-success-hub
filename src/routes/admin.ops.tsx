import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { AdminGate } from "@/components/admin-gate";
import { AdminOpsPanel } from "@/components/admin/ops-panel";

export const Route = createFileRoute("/admin/ops")({
  component: AdminOpsRoute,
});

function AdminOpsRoute() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        <div>
          <h1 className="text-2xl font-semibold">Operations</h1>
          <p className="text-sm text-muted-foreground">
            Production monitoring, feature flags, AI cost governance, and beta tooling.
          </p>
        </div>
        <AdminGate>
          <AdminOpsPanel />
        </AdminGate>
      </div>
    </DashboardLayout>
  );
}