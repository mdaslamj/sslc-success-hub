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

export const subjectChapters: Record<string, Chapter[]> = {
  math: [
    { id: "m1", title: "Real Numbers", progress: 100, done: true, difficulty: "Easy" },
    { id: "m2", title: "Polynomials", progress: 100, done: true, difficulty: "Medium" },
    { id: "m3", title: "Pair of Linear Equations", progress: 95, done: true, difficulty: "Medium" },
    { id: "m4", title: "Quadratic Equations", progress: 55, done: false, difficulty: "Hard" },
    { id: "m5", title: "Arithmetic Progressions", progress: 90, done: true, difficulty: "Medium" },
    { id: "m6", title: "Triangles", progress: 100, done: true, difficulty: "Medium" },
    { id: "m7", title: "Coordinate Geometry", progress: 80, done: true, difficulty: "Medium" },
    { id: "m8", title: "Introduction to Trigonometry", progress: 70, done: false, difficulty: "Medium" },
    { id: "m9", title: "Applications of Trigonometry", progress: 60, done: false, difficulty: "Hard" },
    { id: "m10", title: "Circles", progress: 85, done: true, difficulty: "Medium" },
    { id: "m11", title: "Areas Related to Circles", progress: 75, done: false, difficulty: "Medium" },
    { id: "m12", title: "Surface Areas & Volumes", progress: 40, done: false, difficulty: "Hard" },
    { id: "m13", title: "Statistics", progress: 95, done: true, difficulty: "Easy" },
    { id: "m14", title: "Probability", progress: 80, done: true, difficulty: "Medium" },
    { id: "m15", title: "Constructions", progress: 65, done: false, difficulty: "Medium" },
  ],
  science: [
    { id: "s1", title: "Chemical Reactions and Equations", progress: 90, done: true, difficulty: "Medium" },
    { id: "s2", title: "Acids, Bases and Salts", progress: 85, done: true, difficulty: "Medium" },
    { id: "s3", title: "Metals and Non-metals", progress: 80, done: true, difficulty: "Medium" },
    { id: "s4", title: "Carbon and its Compounds", progress: 45, done: false, difficulty: "Hard" },
    { id: "s5", title: "Life Processes", progress: 100, done: true, difficulty: "Medium" },
    { id: "s6", title: "Control and Coordination", progress: 75, done: false, difficulty: "Medium" },
    { id: "s7", title: "Reproduction in Organisms", progress: 70, done: false, difficulty: "Medium" },
    { id: "s8", title: "Heredity", progress: 60, done: false, difficulty: "Hard" },
    { id: "s9", title: "Light — Reflection & Refraction", progress: 100, done: true, difficulty: "Medium" },
    { id: "s10", title: "Human Eye and Colourful World", progress: 90, done: true, difficulty: "Easy" },
    { id: "s11", title: "Electricity", progress: 35, done: false, difficulty: "Hard" },
    { id: "s12", title: "Magnetic Effects of Current", progress: 50, done: false, difficulty: "Hard" },
    { id: "s13", title: "Our Environment", progress: 80, done: true, difficulty: "Easy" },
    { id: "s14", title: "Sources of Energy", progress: 70, done: false, difficulty: "Easy" },
  ],
  social: [
    { id: "ss1", title: "Nationalism in India", progress: 95, done: true, difficulty: "Medium" },
    { id: "ss2", title: "Making of a Global World", progress: 70, done: false, difficulty: "Medium" },
    { id: "ss3", title: "Forest Society and Colonialism", progress: 35, done: false, difficulty: "Hard" },
    { id: "ss4", title: "Resources & Development", progress: 80, done: true, difficulty: "Easy" },
    { id: "ss5", title: "Agriculture", progress: 75, done: false, difficulty: "Medium" },
    { id: "ss6", title: "Minerals and Energy Resources", progress: 60, done: false, difficulty: "Medium" },
    { id: "ss7", title: "Power Sharing", progress: 90, done: true, difficulty: "Easy" },
    { id: "ss8", title: "Federalism", progress: 70, done: false, difficulty: "Medium" },
    { id: "ss9", title: "Democracy & Diversity", progress: 65, done: false, difficulty: "Medium" },
    { id: "ss10", title: "Development", progress: 55, done: false, difficulty: "Medium" },
    { id: "ss11", title: "Money and Credit", progress: 30, done: false, difficulty: "Hard" },
    { id: "ss12", title: "Globalisation & Indian Economy", progress: 50, done: false, difficulty: "Medium" },
  ],
  english: [
    { id: "e1", title: "A Letter to God", progress: 100, done: true, difficulty: "Easy" },
    { id: "e2", title: "Nelson Mandela: Long Walk to Freedom", progress: 100, done: true, difficulty: "Medium" },
    { id: "e3", title: "Two Stories About Flying", progress: 90, done: true, difficulty: "Medium" },
    { id: "e4", title: "From the Diary of Anne Frank", progress: 85, done: true, difficulty: "Medium" },
    { id: "e5", title: "Glimpses of India", progress: 80, done: true, difficulty: "Easy" },
    { id: "e6", title: "Mijbil the Otter", progress: 75, done: false, difficulty: "Easy" },
    { id: "e7", title: "Grammar — Tenses", progress: 60, done: false, difficulty: "Hard" },
    { id: "e8", title: "Grammar — Reported Speech", progress: 70, done: false, difficulty: "Medium" },
    { id: "e9", title: "Writing — Letters", progress: 85, done: true, difficulty: "Medium" },
    { id: "e10", title: "Writing — Essays", progress: 80, done: true, difficulty: "Medium" },
  ],
  kannada: [
    { id: "k1", title: "ಶಬರಿ", progress: 100, done: true, difficulty: "Medium" },
    { id: "k2", title: "ಹೊಸ ಹಾಡು", progress: 95, done: true, difficulty: "Medium" },
    { id: "k3", title: "ವಚನ ಸಾಹಿತ್ಯ", progress: 90, done: true, difficulty: "Medium" },
    { id: "k4", title: "ಭಾಗ್ಯಶಿಲ್ಪಿಗಳು", progress: 80, done: true, difficulty: "Easy" },
    { id: "k5", title: "ಗದ್ಯ — ಬಸವಣ್ಣನವರ ಜೀವನ", progress: 75, done: false, difficulty: "Easy" },
    { id: "k6", title: "ವ್ಯಾಕರಣ — ಸಂಧಿ", progress: 35, done: false, difficulty: "Hard" },
    { id: "k7", title: "ಪತ್ರ ಲೇಖನ", progress: 40, done: false, difficulty: "Medium" },
    { id: "k8", title: "ಪ್ರಬಂಧ ರಚನೆ", progress: 65, done: false, difficulty: "Medium" },
    { id: "k9", title: "ಪದ್ಯ ವಿಮರ್ಶೆ", progress: 85, done: true, difficulty: "Medium" },
  ],
  hindi: [
    { id: "h1", title: "गद्य — कबीर के दोहे", progress: 80, done: true, difficulty: "Medium" },
    { id: "h2", title: "मीराबाई", progress: 75, done: false, difficulty: "Medium" },
    { id: "h3", title: "बिहारी के दोहे", progress: 70, done: false, difficulty: "Medium" },
    { id: "h4", title: "मैथिलीशरण गुप्त", progress: 60, done: false, difficulty: "Medium" },
    { id: "h5", title: "साखी", progress: 65, done: false, difficulty: "Easy" },
    { id: "h6", title: "व्याकरण — संधि", progress: 30, done: false, difficulty: "Hard" },
    { id: "h7", title: "व्याकरण — समास", progress: 35, done: false, difficulty: "Hard" },
    { id: "h8", title: "अनुवाद", progress: 40, done: false, difficulty: "Hard" },
    { id: "h9", title: "पत्र लेखन", progress: 70, done: false, difficulty: "Easy" },
  ],
};

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
      topic: "Trigonometry",
      difficulty: "Medium",
    },
    {
      id: "mq3",
      question: "The total surface area of a hemisphere of radius r is:",
      options: ["2πr²", "3πr²", "4πr²", "πr²"],
      correctIndex: 1,
      explanation:
        "TSA of hemisphere = curved (2πr²) + base circle (πr²) = 3πr².",
      topic: "Surface Areas & Volumes",
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
      topic: "Chemical Reactions",
      difficulty: "Medium",
    },
    {
      id: "sq3",
      question: "Functional group present in CH₃COOH is:",
      options: ["−OH", "−CHO", "−COOH", "−CO−"],
      correctIndex: 2,
      explanation: "−COOH is the carboxylic acid functional group.",
      topic: "Carbon Compounds",
      difficulty: "Easy",
    },
    {
      id: "sq4",
      question: "The defect of vision in which a person can see nearby objects clearly but not distant objects is:",
      options: ["Hypermetropia", "Myopia", "Presbyopia", "Astigmatism"],
      correctIndex: 1,
      explanation: "Myopia (near-sightedness) — image forms in front of retina.",
      topic: "Human Eye",
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
      topic: "Nationalism in India",
      difficulty: "Easy",
    },
    {
      id: "ssq2",
      question: "Formal sources of credit in India include:",
      options: ["Moneylenders", "Traders", "Banks and cooperatives", "Friends and relatives"],
      correctIndex: 2,
      explanation:
        "Formal sources are supervised by RBI: banks and cooperatives. Others are informal.",
      topic: "Money and Credit",
      difficulty: "Medium",
    },
    {
      id: "ssq3",
      question: "The Bhilangana valley is famous for which type of forest?",
      options: ["Tropical evergreen", "Mangrove", "Reserved", "Thorny"],
      correctIndex: 2,
      explanation: "Reserved forests are managed for permanent timber production.",
      topic: "Forest Society",
      difficulty: "Hard",
    },
    {
      id: "ssq4",
      question: "Which of these is NOT a feature of federalism?",
      options: ["Two or more levels of government", "Single source of authority", "Written constitution", "Independent judiciary"],
      correctIndex: 1,
      explanation: "Federalism distributes authority across levels, not a single source.",
      topic: "Federalism",
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
