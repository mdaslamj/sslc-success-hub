import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { AuraWarRoom } from "@/components/predictions/AuraWarRoom";

export const Route = createFileRoute("/predictions")({
  head: () => ({
    meta: [
      { title: "Aura — AI Prediction" },
      {
        name: "description",
        content:
          "Exam Intelligence War Room — chapter recovery ladder, marks at risk, and probability movement across SSLC subjects.",
      },
    ],
  }),
  component: PredictionsPage,
});

function PredictionsPage() {
  return (
    <DashboardLayout title="AI Prediction">
      <AuraWarRoom />
    </DashboardLayout>
  );
}
