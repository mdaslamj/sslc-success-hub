export type Subject = {
  id: string;
  name: string;
  nameKn?: string;
  emoji: string;
  color: string;
  completion: number;
  mastery: number;
  target: number;
  predicted: number;
  chapters: number;
  chaptersDone: number;
  weakTopics: string[];
  strongTopics: string[];
};

export const subjects: Subject[] = [
  {
    id: "math",
    name: "Mathematics",
    nameKn: "ಗಣಿತ",
    emoji: "📐",
    color: "oklch(0.6 0.18 250)",
    completion: 72,
    mastery: 78,
    target: 95,
    predicted: 88,
    chapters: 15,
    chaptersDone: 11,
    weakTopics: ["Quadratic Equations", "Surface Areas"],
    strongTopics: ["Real Numbers", "Triangles", "Statistics"],
  },
  {
    id: "science",
    name: "Science",
    nameKn: "ವಿಜ್ಞಾನ",
    emoji: "🧪",
    color: "oklch(0.65 0.16 145)",
    completion: 65,
    mastery: 70,
    target: 92,
    predicted: 84,
    chapters: 16,
    chaptersDone: 10,
    weakTopics: ["Electricity", "Carbon Compounds"],
    strongTopics: ["Light", "Life Processes"],
  },
  {
    id: "social",
    name: "Social Science",
    nameKn: "ಸಮಾಜ ವಿಜ್ಞಾನ",
    emoji: "🌍",
    color: "oklch(0.68 0.15 60)",
    completion: 58,
    mastery: 62,
    target: 90,
    predicted: 79,
    chapters: 24,
    chaptersDone: 14,
    weakTopics: ["Money & Credit", "Forest Society"],
    strongTopics: ["Nationalism in India"],
  },
  {
    id: "english",
    name: "English",
    nameKn: "ಇಂಗ್ಲಿಷ್",
    emoji: "📘",
    color: "oklch(0.6 0.17 310)",
    completion: 80,
    mastery: 82,
    target: 90,
    predicted: 87,
    chapters: 12,
    chaptersDone: 10,
    weakTopics: ["Grammar — Tenses"],
    strongTopics: ["Prose", "Comprehension"],
  },
  {
    id: "kannada",
    name: "Kannada",
    nameKn: "ಕನ್ನಡ",
    emoji: "ಕ",
    color: "oklch(0.62 0.18 25)",
    completion: 68,
    mastery: 74,
    target: 95,
    predicted: 86,
    chapters: 14,
    chaptersDone: 9,
    weakTopics: ["ವ್ಯಾಕರಣ — ಸಂಧಿ", "ಪತ್ರ ಲೇಖನ"],
    strongTopics: ["ಪದ್ಯ ವಿಮರ್ಶೆ"],
  },
  {
    id: "hindi",
    name: "Hindi",
    nameKn: "ಹಿಂದಿ",
    emoji: "ह",
    color: "oklch(0.65 0.16 20)",
    completion: 55,
    mastery: 60,
    target: 85,
    predicted: 75,
    chapters: 12,
    chaptersDone: 7,
    weakTopics: ["व्याकरण", "अनुवाद"],
    strongTopics: ["गद्य"],
  },
];

export const weeklyStudy = [
  { day: "Mon", hours: 4.5, target: 5 },
  { day: "Tue", hours: 5.2, target: 5 },
  { day: "Wed", hours: 3.8, target: 5 },
  { day: "Thu", hours: 6.1, target: 5 },
  { day: "Fri", hours: 4.7, target: 5 },
  { day: "Sat", hours: 7.2, target: 6 },
  { day: "Sun", hours: 5.8, target: 6 },
];

export const monthlyProgress = [
  { month: "Aug", score: 62 },
  { month: "Sep", score: 68 },
  { month: "Oct", score: 74 },
  { month: "Nov", score: 79 },
  { month: "Dec", score: 83 },
  { month: "Jan", score: 86 },
];

export const motivationalQuotes = [
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "ಜ್ಞಾನವೇ ಶಕ್ತಿ — Knowledge is power.", author: "Kannada Proverb" },
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
];

export const todayTasks = [
  { id: 1, subject: "Mathematics", task: "Quadratic Equations — Practice Set 4", time: "45 min", done: true },
  { id: 2, subject: "Science", task: "Revise Electricity chapter notes", time: "30 min", done: true },
  { id: 3, subject: "Kannada", task: "ಪದ್ಯ ವಿಮರ್ಶೆ — Hosa Hadu", time: "40 min", done: false },
  { id: 4, subject: "Social", task: "Mock test — Money & Credit", time: "1 hr", done: false },
  { id: 5, subject: "English", task: "Grammar — Reported Speech", time: "25 min", done: false },
];

export const achievements = [
  { icon: "🔥", label: "12-day streak", earned: true },
  { icon: "🏆", label: "Top of class", earned: true },
  { icon: "🎯", label: "Target hit", earned: true },
  { icon: "📚", label: "100 chapters", earned: false },
  { icon: "⚡", label: "Speed solver", earned: true },
  { icon: "🌟", label: "Mastery", earned: false },
];

// SSLC exam typically ~March; pick a future date dynamically
export function getExamDate(): Date {
  const now = new Date();
  const year = now.getMonth() >= 2 ? now.getFullYear() + 1 : now.getFullYear();
  return new Date(year, 2, 21); // March 21
}

export function getDaysToExam(): number {
  const diff = getExamDate().getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export const overallPrepScore = Math.round(
  subjects.reduce((sum, s) => sum + s.completion, 0) / subjects.length,
);

export const predictedPercentage = Math.round(
  subjects.reduce((sum, s) => sum + s.predicted, 0) / subjects.length,
);

export const targetPercentage = Math.round(
  subjects.reduce((sum, s) => sum + s.target, 0) / subjects.length,
);

export function gradeFor(pct: number): string {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C";
  return "D";
}

// 7 weeks heatmap
export const heatmap = Array.from({ length: 7 }).map((_, w) =>
  Array.from({ length: 7 }).map(() => Math.floor(Math.random() * 5)),
);

export const studyStreak = 12;