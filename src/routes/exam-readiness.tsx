import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { ExamReadiness } from "@/components/predictions/ExamReadiness";

export const Route = createFileRoute("/exam-readiness")({
  head: () => ({
    meta: [
      { title: "Aura — Exam Readiness" },
      {
        name: "description",
        content:
          "Exam readiness — targets, chapter gaps, marks at risk, and probability movement across SSLC subjects.",
      },
    ],
  }),
  component: ExamReadinessPage,
});

function ExamReadinessPage() {
  return (
    <DashboardLayout title="Exam Readiness">
      <ExamReadiness />
    </DashboardLayout>
  );
}
