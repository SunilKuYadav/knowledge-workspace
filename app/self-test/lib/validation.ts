import type { ZodSchema } from "zod";

import { CONTENT_TRUNCATION_LIMIT } from "./constants";

/* ─── Content Truncation ─────────────────────────────────── */

/**
 * Truncates content to a maximum character limit.
 * Returns the original string if it is within the limit.
 *
 * @param content - The text content to truncate
 * @param limit - Maximum character count (defaults to 12,000)
 * @returns The truncated string
 */
export function truncateContent(
  content: string,
  limit: number = CONTENT_TRUNCATION_LIMIT
): string {
  if (content.length <= limit) {
    return content;
  }
  return content.slice(0, limit);
}

/* ─── AI Response Validation ─────────────────────────────── */

/**
 * Result of validating an AI response against a Zod schema.
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Validates an AI response against a Zod schema.
 * Returns a discriminated union indicating success with parsed data
 * or failure with an error message.
 *
 * @param schema - The Zod schema to validate against
 * @param data - The raw data to validate (typically parsed JSON from AI)
 * @returns Validated and typed data or an error description
 */
export function validateAIResponse<T>(
  schema: ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errorMessage = result.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  return { success: false, error: errorMessage };
}
