/**
 * Context Profiles — predefined context window sizes for inference tuning.
 *
 * Rather than scattering magic numbers, define named presets that are
 * easy to update as hardware or model capabilities change.
 */

export const CONTEXT_PROFILE = {
  /** Quick utility tasks — classify, extract, enhance */
  SMALL: 4_096,
  /** Short-form generation — flashcards, summaries */
  MEDIUM: 8_192,
  /** Standard generation — notes, artifacts, assessments */
  LARGE: 10_384,
  /** Extended context — repository review, large code analysis */
  XL: 32_768,
} as const;

export type ContextProfileKey = keyof typeof CONTEXT_PROFILE;
