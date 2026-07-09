/**
 * Model Router — routes AI requests to the appropriate model based on task type.
 *
 * Three-tier model routing:
 * - "teaching" (Qwen3-30B): General AI tasks — topics, study plans, artifacts, revision, etc.
 * - "coding" (Qwen3-Coder-30B): Coding interview, code review, problem generation.
 * - "fast" (Qwen2.5-14B): Prompt enhancement, quick parsing, lightweight utility tasks.
 *
 * Configuration is loaded from environment variables:
 * - OPENAI_MODEL          → fallback default model
 * - OPENAI_MODEL_TEACHING → general/teaching model
 * - OPENAI_MODEL_CODING   → coding-specific model
 * - OPENAI_MODEL_FAST     → fast/lightweight model
 */

export type ModelTier = "teaching" | "coding" | "fast";

/**
 * Maps API route paths (or logical task names) to model tiers.
 */
const ROUTE_TO_TIER: Record<string, ModelTier> = {
  // ─── Teaching / General (Qwen3-30B) ──────────────────────────────
  "ai/route": "teaching",
  "ai/generate-artifact": "teaching",
  "ai/generate-text": "teaching",
  "ai/study-plans": "teaching",
  "ai/review-session": "teaching",
  "ai/learning-progress": "teaching",
  "ai/creation-assist": "teaching",
  "ai/merge-suggest": "teaching",
  "ai/problem/generate-description": "teaching",
  "ai/problem/generate-note": "teaching",
  "ai/problem/generate-variation": "teaching",
  "ai/assessment/generate": "teaching",
  "ai/assessment/evaluate": "teaching",
  "ai/assessment/feedback": "teaching",
  "ai/assessment/content-update": "teaching",
  "quick-create": "teaching",

  // ─── Coding (Qwen3-Coder-30B) ────────────────────────────────────
  "ai/coding-interview/evaluate": "coding",
  "ai/coding-interview/follow-up": "coding",
  "ai/coding-interview/generate-problem": "coding",
  "ai/coding-interview/hint": "coding",
  "ai/coding-interview/score": "coding",

  // ─── Fast / Utility (Qwen2.5-14B) ────────────────────────────────
  "ai/enhance-prompt": "fast",
  "ai/parse-form": "fast",
};

/**
 * Returns the model name for a given tier, reading from environment variables.
 */
function getModelForTier(tier: ModelTier): string {
  const fallback = process.env.OPENAI_MODEL || "gpt-3.5-turbo";

  switch (tier) {
    case "teaching":
      return process.env.OPENAI_MODEL_TEACHING || fallback;
    case "coding":
      return process.env.OPENAI_MODEL_CODING || fallback;
    case "fast":
      return process.env.OPENAI_MODEL_FAST || fallback;
    default:
      return fallback;
  }
}

/**
 * Resolves the appropriate model for a given route key.
 *
 * @param routeKey - A route identifier matching a key in ROUTE_TO_TIER
 *                   (e.g., "ai/coding-interview/evaluate")
 * @returns The model name to use for this route
 *
 * @example
 * ```ts
 * const model = getModelForRoute("ai/coding-interview/evaluate");
 * // → "qwen3-coder-30b-a3b-instruct-mlx"
 *
 * const model = getModelForRoute("ai/generate-artifact");
 * // → "qwen3-30b-a3b-mlx"
 *
 * const model = getModelForRoute("ai/enhance-prompt");
 * // → "qwen2.5-coder-14b-instruct"
 * ```
 */
export function getModelForRoute(routeKey: string): string {
  const tier = ROUTE_TO_TIER[routeKey] || "teaching";
  return getModelForTier(tier);
}

/**
 * Directly get a model by tier name. Useful when the caller knows
 * the task category but doesn't have a route key.
 *
 * @example
 * ```ts
 * const model = getModel("coding");
 * const model = getModel("fast");
 * ```
 */
export function getModel(tier: ModelTier): string {
  return getModelForTier(tier);
}

/**
 * Returns all configured models for debugging/status display.
 */
export function getAllModels(): Record<ModelTier, string> {
  return {
    teaching: getModelForTier("teaching"),
    coding: getModelForTier("coding"),
    fast: getModelForTier("fast"),
  };
}
