import {
  SSLC_SUBJECTS,
  PLANNER_TODAY_TASKS,
  buildSubjectChaptersMap,
} from "@/data/sslc-academic-catalog";

/** Lovable = visual generation · Cursor = engineering · GitHub = source of truth */

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

export const subjects: Subject[] = SSLC_SUBJECTS.map((s) => ({
  id: s.id,
  name: s.name,
  nameKn: s.nameKn,
  emoji: s.emoji,
  color: s.color,
  completion: s.completion,
  mastery: s.mastery,
  target: s.target,
  predicted: s.predicted,
  chapters: s.chapters,
  chaptersDone: s.chaptersDone,
  weakTopics: s.weakTopics,
  strongTopics: s.strongTopics,
}));

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

export const todayTasks = PLANNER_TODAY_TASKS;

export const achievements = [
  { icon: "🔥", label: "7-day SSLC study streak", earned: true },
  { icon: "📐", label: "Triangles chapter test passed", earned: true },
  { icon: "⚡", label: "Electricity numerals cleared", earned: true },
  { icon: "📚", label: "15 chapters at 75%+ mastery", earned: false },
  { icon: "🎯", label: "90% target on track", earned: false },
  { icon: "🌟", label: "Full syllabus revision cycle", earned: false },
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

/** Deterministic study-intensity heatmap derived from weekly hours (no random demo data). */
export const heatmap = weeklyStudy.map((day, weekIndex) =>
  Array.from({ length: 7 }, (_, dayIndex) => {
    const base = Math.min(4, Math.round(day.hours));
    const spread = (weekIndex + dayIndex) % 3;
    return Math.min(4, Math.max(0, base - 1 + spread));
  }),
);

export const studyStreak = 7;
// ---------- Chapter & MCQ data ----------
export type Chapter = {
  id: string;
  title: string;
  titleKn?: string;
  progress: number; // 0-100
  done: boolean;
  difficulty: "Easy" | "Medium" | "Hard";
};

export type MCQ = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
  difficulty: "Easy" | "Medium" | "Hard";
};

export const subjectChapters: Record<string, Chapter[]> = buildSubjectChaptersMap();

export const subjectMCQs: Record<string, MCQ[]> = {
  math: [
    {
      id: "mq1",
      question: "The roots of the quadratic equation x² − 5x + 6 = 0 are:",
      options: ["1 and 6", "2 and 3", "−2 and −3", "5 and 1"],
      correctIndex: 1,
      explanation:
        "Factorise: x² − 5x + 6 = (x − 2)(x − 3). So roots are x = 2 and x = 3.",
      topic: "Quadratic Equations",
      difficulty: "Easy",
    },
    {
      id: "mq2",
      question: "If sin θ = 3/5, then cos θ equals:",
      options: ["4/5", "5/3", "3/4", "5/4"],
      correctIndex: 0,
      explanation:
        "sin²θ + cos²θ = 1 → cos²θ = 1 − 9/25 = 16/25 → cos θ = 4/5 (acute angle).",
      topic: "Introduction to Trigonometry",
      difficulty: "Medium",
    },
    {
      id: "mq3",
      question: "The total surface area of a hemisphere of radius r is:",
      options: ["2πr²", "3πr²", "4πr²", "πr²"],
      correctIndex: 1,
      explanation:
        "TSA of hemisphere = curved (2πr²) + base circle (πr²) = 3πr².",
      topic: "Surface Areas and Volumes",
      difficulty: "Medium",
    },
    {
      id: "mq4",
      question: "The 10th term of the AP: 2, 7, 12, … is:",
      options: ["45", "47", "50", "52"],
      correctIndex: 1,
      explanation: "aₙ = a + (n−1)d = 2 + 9×5 = 47.",
      topic: "Arithmetic Progressions",
      difficulty: "Easy",
    },
    {
      id: "mq5",
      question: "Probability of getting a prime number when a die is rolled is:",
      options: ["1/2", "1/3", "2/3", "1/6"],
      correctIndex: 0,
      explanation: "Primes on a die: 2, 3, 5 → 3 favourable out of 6 → 1/2.",
      topic: "Probability",
      difficulty: "Easy",
    },
  ],
  science: [
    {
      id: "sq1",
      question: "The SI unit of electric current is:",
      options: ["Volt", "Ohm", "Ampere", "Coulomb"],
      correctIndex: 2,
      explanation: "Electric current is measured in Ampere (A).",
      topic: "Electricity",
      difficulty: "Easy",
    },
    {
      id: "sq2",
      question:
        "Which of the following is an example of a combination reaction?",
      options: [
        "2H₂O → 2H₂ + O₂",
        "CaO + H₂O → Ca(OH)₂",
        "Zn + CuSO₄ → ZnSO₄ + Cu",
        "AgNO₃ + NaCl → AgCl + NaNO₃",
      ],
      correctIndex: 1,
      explanation:
        "Two reactants combine to form a single product — a combination reaction.",
      topic: "Chemical Reactions and Equations",
      difficulty: "Medium",
    },
    {
      id: "sq3",
      question: "Functional group present in CH₃COOH is:",
      options: ["−OH", "−CHO", "−COOH", "−CO−"],
      correctIndex: 2,
      explanation: "−COOH is the carboxylic acid functional group.",
      topic: "Carbon and its Compounds",
      difficulty: "Easy",
    },
    {
      id: "sq4",
      question: "The defect of vision in which a person can see nearby objects clearly but not distant objects is:",
      options: ["Hypermetropia", "Myopia", "Presbyopia", "Astigmatism"],
      correctIndex: 1,
      explanation: "Myopia (near-sightedness) — image forms in front of retina.",
      topic: "The Human Eye and the Colourful World",
      difficulty: "Easy",
    },
    {
      id: "sq5",
      question: "Resistance of a wire depends on:",
      options: ["Length only", "Area only", "Length and area", "Voltage only"],
      correctIndex: 2,
      explanation: "R = ρL/A — proportional to length, inversely to area.",
      topic: "Electricity",
      difficulty: "Medium",
    },
  ],
  social: [
    {
      id: "ssq1",
      question: "The Non-Cooperation Movement was launched by:",
      options: ["Subhas Chandra Bose", "Mahatma Gandhi", "Jawaharlal Nehru", "Sardar Patel"],
      correctIndex: 1,
      explanation: "Mahatma Gandhi launched the Non-Cooperation Movement in 1920.",
      topic: "The Freedom Struggle",
      difficulty: "Easy",
    },
    {
      id: "ssq2",
      question: "Formal sources of credit in India include:",
      options: ["Moneylenders", "Traders", "Banks and cooperatives", "Friends and relatives"],
      correctIndex: 2,
      explanation:
        "Formal sources are supervised by RBI: banks and cooperatives. Others are informal.",
      topic: "Banking Transactions",
      difficulty: "Medium",
    },
    {
      id: "ssq3",
      question: "Which of the following is a renewable forest resource?",
      options: ["Timber from sustainably managed forests", "Coal deposits", "Iron ore", "Petroleum"],
      correctIndex: 0,
      explanation: "Timber from sustainably managed forests can be replenished; minerals and fossil fuels are non-renewable.",
      topic: "India Forest Resources",
      difficulty: "Medium",
    },
    {
      id: "ssq4",
      question: "Which body implements government policies at the district level in Karnataka?",
      options: ["District Commissioner", "State Legislature", "Lok Sabha", "High Court"],
      correctIndex: 0,
      explanation: "The District Commissioner (Deputy Commissioner) administers district-level public administration.",
      topic: "Public Administration – An Introduction",
      difficulty: "Medium",
    },
  ],
  english: [
    {
      id: "eq1",
      question: "In 'A Letter to God', Lencho's faith was in:",
      options: ["The post office", "God", "The government", "His neighbours"],
      correctIndex: 1,
      explanation: "Lencho had unshakable faith in God despite losing his crop.",
      topic: "A Letter to God",
      difficulty: "Easy",
    },
    {
      id: "eq2",
      question: "Choose the correct reported form: She said, \"I am tired.\"",
      options: [
        "She said that she was tired.",
        "She said that I am tired.",
        "She says that she was tired.",
        "She said that she is tired.",
      ],
      correctIndex: 0,
      explanation: "Past reporting verb → present becomes past; pronoun changes I → she.",
      topic: "Reported Speech",
      difficulty: "Medium",
    },
    {
      id: "eq3",
      question: "Pick the correct tense: 'By next year, she ___ her degree.'",
      options: ["will complete", "will have completed", "completes", "has completed"],
      correctIndex: 1,
      explanation: "Future Perfect — action completed before a future point.",
      topic: "Tenses",
      difficulty: "Hard",
    },
  ],
  kannada: [
    {
      id: "kq1",
      question: "'ಗುರು + ಉಪದೇಶ' — ಇದು ಯಾವ ಸಂಧಿ?",
      options: ["ಸವರ್ಣದೀರ್ಘ ಸಂಧಿ", "ಗುಣಸಂಧಿ", "ಯಣ್ ಸಂಧಿ", "ವೃದ್ಧಿ ಸಂಧಿ"],
      correctIndex: 1,
      explanation: "ಗುರು + ಉಪದೇಶ = ಗುರೂಪದೇಶ — ಗುಣಸಂಧಿಯ ಉದಾಹರಣೆ.",
      topic: "ವ್ಯಾಕರಣ — ಸಂಧಿ",
      difficulty: "Hard",
    },
    {
      id: "kq2",
      question: "'ಹೊಸ ಹಾಡು' ಪದ್ಯದ ಕವಿ ಯಾರು?",
      options: ["ಕುವೆಂಪು", "ದ.ರಾ. ಬೇಂದ್ರೆ", "ಗೋಪಾಲಕೃಷ್ಣ ಅಡಿಗ", "ಚೆನ್ನವೀರ ಕಣವಿ"],
      correctIndex: 0,
      explanation: "'ಹೊಸ ಹಾಡು' ಕವನವನ್ನು ಕುವೆಂಪು ಬರೆದಿದ್ದಾರೆ.",
      topic: "ಪದ್ಯ ವಿಮರ್ಶೆ",
      difficulty: "Medium",
    },
    {
      id: "kq3",
      question: "ಔಪಚಾರಿಕ ಪತ್ರದಲ್ಲಿ ಸ್ವೀಕರಣದಾರನ ವಿಳಾಸ ಎಲ್ಲಿ ಬರೆಯಬೇಕು?",
      options: ["ಪತ್ರದ ಎಡಭಾಗದಲ್ಲಿ ಮೇಲೆ", "ಪತ್ರದ ಬಲಭಾಗದಲ್ಲಿ ಮೇಲೆ", "ಪತ್ರದ ಕೆಳಗೆ", "ವಿಷಯದ ನಂತರ"],
      correctIndex: 0,
      explanation: "ಔಪಚಾರಿಕ ಪತ್ರದಲ್ಲಿ ಸ್ವೀಕರಣದಾರನ ವಿಳಾಸ ಎಡಭಾಗದಲ್ಲಿ ಮೇಲೆ ಬರೆಯಲಾಗುತ್ತದೆ.",
      topic: "ಪತ್ರ ಲೇಖನ",
      difficulty: "Medium",
    },
  ],
  hindi: [
    {
      id: "hq1",
      question: "'विद्यालय' शब्द में कौन सी संधि है?",
      options: ["स्वर संधि", "व्यंजन संधि", "विसर्ग संधि", "गुण संधि"],
      correctIndex: 0,
      explanation: "विद्या + आलय = विद्यालय — दीर्घ स्वर संधि।",
      topic: "व्याकरण — संधि",
      difficulty: "Medium",
    },
    {
      id: "hq2",
      question: "'राजपुत्र' किस समास का उदाहरण है?",
      options: ["तत्पुरुष", "द्वंद्व", "बहुव्रीहि", "कर्मधारय"],
      correctIndex: 0,
      explanation: "राजा का पुत्र = राजपुत्र (षष्ठी तत्पुरुष)।",
      topic: "व्याकरण — समास",
      difficulty: "Hard",
    },
    {
      id: "hq3",
      question: "'I am going to school' का सही अनुवाद है:",
      options: ["मैं स्कूल जा रहा हूँ।", "मैं स्कूल गया।", "मैं स्कूल जाऊँगा।", "मैं स्कूल जाता हूँ।"],
      correctIndex: 0,
      explanation: "Present continuous → मैं स्कूल जा रहा हूँ।",
      topic: "अनुवाद",
      difficulty: "Easy",
    },
  ],
};
