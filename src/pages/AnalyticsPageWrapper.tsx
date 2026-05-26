/**
 * AnalyticsPageWrapper — Task 10
 * Route: /analytics
 *
 * Wraps the AnalyticsDashboard in DashboardLayout and
 * connects the "Practice This Chapter" button to the /practice route.
 */

import { useNavigate } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/dashboard-layout";
import { AnalyticsDashboard } from "@/components/practice/AnalyticsDashboard";
import { useAnalytics } from "@/hooks/use-analytics";

export default function AnalyticsPageWrapper() {
  const { data } = useAnalytics();
  const navigate = useNavigate();

  const handlePracticeChapter = (chapterId: string, subjectId: string) => {
    navigate({
      to: "/practice",
      search: { chapter: chapterId, subject: subjectId },
    });
  };

  return (
    <DashboardLayout title="My Progress">
      <AnalyticsDashboard
        data={data}
        onPracticeChapter={handlePracticeChapter}
      />
    </DashboardLayout>
  );
}
