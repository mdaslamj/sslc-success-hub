// Barrel export for Firestore service functions.
// Import from here to keep call sites stable as the data layer evolves:
//   import { fetchSubjects, fetchChapters, fetchMcqs } from "@/integrations/firebase/services";
export * from "../subjects";
export * from "./chapterProgress";
export * from "./mcqs";
export * from "./notes";
export * from "./syllabus-import";
export * from "./user-progress";
export * from "./study-sessions";
export * from "./achievements";
export * from "./analytics";
export * from "./user-achievements";
export * from "./streaks";
export * from "./quizzes";
export * from "./quiz-attempts";
export * from "./study-plans";
export * from "./planner-tasks";
export * from "./revision-schedules";
export * from "./recommendations";
export * from "./ai-insights";
export * from "./users";
export * from "./mock-exams";
export * from "./syllabus-content";
export * from "./library-resources";
export * from "./answer-uploads";
export * from "./evaluations";
// Mathematics Intelligence System
export * from "./math-chapters";
export * from "./math-questions";
export * from "./math-model-answers";
export * from "./math-formulas";
export * from "./math-rubrics";
export * from "./math-keywords";
export * from "./math-common-mistakes";
export * from "./math-chapter-analytics";
export * from "./math-import";
// Weakness Diagnosis & Adaptive Remediation Engine
export * from "./performance-records";
export * from "./weakness-profiles";
export * from "./remediation-plans";
export * from "./chapter-intelligence";
// Adaptive Study Planner & Intervention Engine
export * from "./intervention-plans";
export * from "./adaptive-schedules";
export * from "./revision-queue";
export * from "./remediation-sessions";
export * from "./memory-tracking";
// GPT/Gemini Semantic Reasoning Layer
export * from "./ai-tutoring-sessions";
export * from "./semantic-evaluations";
export * from "./hint-history";
export * from "./reasoning-feedback";
// Board Readiness Prediction + Exam Simulation Engine
export * from "./exam-simulations";
export * from "./board-readiness";
// AI Scan & Solve experience
export * from "./scans";
export * from "./solved-questions";
export * from "./ai-evaluations";
export * from "./practice-recommendations";
// Continuous Learning Memory + Tutoring Continuity Engine
export * from "./learning-memory";