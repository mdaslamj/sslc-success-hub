// Barrel export for Firestore service functions.
// Import from here to keep call sites stable as the data layer evolves:
//   import { fetchSubjects, fetchChapters, fetchMcqs } from "@/integrations/firebase/services";
export * from "../subjects";
export * from "./chapterProgress";
export * from "./mcqs";
export * from "./notes";
export * from "./syllabus-import";