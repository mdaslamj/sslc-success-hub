/**
 * Mathematics Intelligence layer.
 *
 * Pure functions over math reference data + per-user analytics. No UI, no
 * Firestore writes — call sites are free to compose these into AI tutor
 * prompts, OCR evaluators, mock test builders, or revision recommenders.
 */
export * from "./question-selector";
export * from "./mock-test-builder";
export * from "./revision-recommender";
export * from "./formula-tracker";
export * from "./speed-analyzer";
export * from "./mistake-detector";
export * from "./rubric-grader";
export * from "./tutor-context";
export * from "./mastery-aggregator";
export * from "./mastery-tiers";