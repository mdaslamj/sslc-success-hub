import type { ClassAnalytics } from "@/types/teacherDashboard";

const CLASS_ANALYTICS_COLLECTION = "class_analytics";

export async function getClassAnalytics(
  teacherId: string,
  subjectId: string,
): Promise<ClassAnalytics | null> {
  try {
    const { db } = await import("@/integrations/firebase/config");
    const { doc, getDoc } = await import("firebase/firestore");

    const snap = await getDoc(
      doc(db, CLASS_ANALYTICS_COLLECTION, `${teacherId}_${subjectId}`),
    );

    if (snap.exists()) {
      return snap.data() as ClassAnalytics;
    }

    return generateDemoClassAnalytics(subjectId);
  } catch {
    return generateDemoClassAnalytics(subjectId);
  }
}

function generateDemoClassAnalytics(subjectId: string): ClassAnalytics {
  return {
    schoolId: "demo",
    subjectId,
    totalStudents: 42,
    activeStudents: 31,
    lastUpdated: new Date().toISOString(),
    chapterAnalytics: [
      {
        chapterId: "electricity",
        chapterName: "Electricity",
        blueprintMarks: 8,
        averageMastery: 52,
        studentsAtRisk: 14,
        studentsStable: 19,
        studentsStrong: 9,
        primaryGapType: "procedural",
        trendLastWeek: "improving",
      },
      {
        chapterId: "light-reflection-refraction",
        chapterName: "Light",
        blueprintMarks: 8,
        averageMastery: 61,
        studentsAtRisk: 9,
        studentsStable: 22,
        studentsStrong: 11,
        primaryGapType: "conceptual",
        trendLastWeek: "stable",
      },
      {
        chapterId: "carbon-and-its-compounds",
        chapterName: "Carbon Compounds",
        blueprintMarks: 8,
        averageMastery: 44,
        studentsAtRisk: 18,
        studentsStable: 16,
        studentsStrong: 8,
        primaryGapType: "conceptual",
        trendLastWeek: "declining",
      },
      {
        chapterId: "life-processes",
        chapterName: "Life Processes",
        blueprintMarks: 6,
        averageMastery: 58,
        studentsAtRisk: 11,
        studentsStable: 20,
        studentsStrong: 11,
        primaryGapType: "procedural",
        trendLastWeek: "improving",
      },
      {
        chapterId: "heredity",
        chapterName: "Heredity",
        blueprintMarks: 5,
        averageMastery: 49,
        studentsAtRisk: 15,
        studentsStable: 18,
        studentsStrong: 9,
        primaryGapType: "expression",
        trendLastWeek: "stable",
      },
    ],
    subjectSummary: {
      averagePredictedScore: 58,
      studentsOnTrack: 19,
      studentsAtRisk: 8,
      topChapter: "Light",
      weakestChapter: "Carbon Compounds",
      recommendedFocus:
        "Carbon Compounds needs focused teaching — 18 students at risk with conceptual gaps",
    },
  };
}
