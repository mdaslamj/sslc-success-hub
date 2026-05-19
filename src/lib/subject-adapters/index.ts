/**
 * Subject Capability Adapter System.
 *
 * Subject-aware overrides on top of the shared intelligence backbone.
 * Always resolve via `getSubjectAdapter(subjectId)` — never import a
 * concrete adapter directly from feature code, so new subjects plug in
 * without touching call sites.
 */
export * from "./types";
export * from "./registry";
export { mathAdapter } from "./math-adapter";
export { scienceAdapter } from "./science-adapter";
export { socialScienceAdapter } from "./social-science-adapter";
export { languageAdapter } from "./language-adapter";
export { applyAdapterToReadiness } from "./apply";
export { adapterSystemPromptFor } from "./apply";
export { adaptedRetentionScore } from "./apply";