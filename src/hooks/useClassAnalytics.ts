import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { getClassAnalytics } from "@/lib/teacherAnalyticsService";
import type { ClassAnalytics } from "@/types/teacherDashboard";

export function useClassAnalytics(subjectId: string) {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<ClassAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setAnalytics(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    void getClassAnalytics(user.uid, subjectId)
      .then((data) => {
        if (active) setAnalytics(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user, subjectId]);

  return { analytics, loading };
}
