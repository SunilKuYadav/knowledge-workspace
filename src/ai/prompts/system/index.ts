/**
 * System context modules — composable personality and behavior building blocks.
 *
 * Each module defines a specific aspect of how the AI should behave.
 * Combine them via composePrompt() to tailor prompts per feature.
 */

export { IDENTITY_CONTEXT } from './identity';
export { TEACHING_CONTEXT } from './teaching';
export { INTERVIEW_CONTEXT } from './interview';
export { ENGINEERING_CONTEXT } from './engineering';
export { CODING_CONTEXT } from './coding';
export { MARKDOWN_CONTEXT } from './markdown';
export { JSON_CONTEXT } from './json';
export { SAFETY_CONTEXT } from './safety';
export { KNOWLEDGE_CONTEXT } from './knowledge';
export { DSA_CONTEXT } from './dsa';
export { SYSTEM_DESIGN_CONTEXT } from './system-design';
export { REVISION_CONTEXT } from './revision';
