/**
 * Prompt SDK — composable, modular prompt architecture.
 *
 * This module exposes:
 * - System context modules (identity, teaching, interview, etc.)
 * - Prompt builders (one per feature)
 * - JSON schemas for structured responses
 * - Utility functions (composePrompt, format helpers)
 *
 * Usage:
 * ```ts
 * import { composePrompt, IDENTITY_CONTEXT, TEACHING_CONTEXT } from '@/ai/prompts';
 *
 * const prompt = composePrompt({
 *   modules: [IDENTITY_CONTEXT, TEACHING_CONTEXT],
 *   task: 'Explain binary search.',
 * });
 * ```
 */

// ─── System Modules ───
export {
  IDENTITY_CONTEXT,
  TEACHING_CONTEXT,
  INTERVIEW_CONTEXT,
  ENGINEERING_CONTEXT,
  CODING_CONTEXT,
  MARKDOWN_CONTEXT,
  JSON_CONTEXT,
  SAFETY_CONTEXT,
  KNOWLEDGE_CONTEXT,
  DSA_CONTEXT,
  SYSTEM_DESIGN_CONTEXT,
  REVISION_CONTEXT,
} from "./system";

// ─── Builders ───
export {
  buildSummaryPrompt,
  buildExplainPrompt,
  buildInterviewPrepPrompt,
  buildSimilarProblemsPrompt,
  buildQuizPrompt,
  buildFlashcardsPrompt,
  buildTopicParsePrompt,
  buildProblemParsePrompt,
  buildGenerateTextPrompt,
  buildCustomGeneralPrompt,
  buildCustomItemPrompt,
  buildGenerateContentPrompt,
  buildArtifactPrompt,
  buildReviewPrompt,
  buildEvaluationPrompt,
  buildHintPrompt,
  buildSessionSummaryPrompt,
} from "./builders";

// ─── Schemas ───
export {
  QUIZ_SCHEMA,
  FLASHCARDS_SCHEMA,
  REVIEW_QUESTIONS_SCHEMA,
  EVALUATION_SCHEMA,
  SESSION_SUMMARY_SCHEMA,
  TOPIC_PARSE_SCHEMA,
  PROBLEM_PARSE_SCHEMA,
  SIMILAR_PROBLEMS_SCHEMA,
} from "./schemas";

// ─── Utils ───
export { composePrompt } from "./utils/compose";
export type { ComposeOptions } from "./utils/compose";
export { section, field, metadata, joinBlocks } from "./utils/format";

// ─── Backward Compatibility ───
// The old SYSTEM_CONTEXT and withContext are kept for gradual migration.
import { IDENTITY_CONTEXT } from "./system/identity";

/**
 * @deprecated Use IDENTITY_CONTEXT or compose specific modules instead.
 */
export const SYSTEM_CONTEXT = IDENTITY_CONTEXT;

/**
 * @deprecated Use composePrompt() with specific modules instead.
 */
export function withContext(prompt: string): string {
  return IDENTITY_CONTEXT + prompt;
}
