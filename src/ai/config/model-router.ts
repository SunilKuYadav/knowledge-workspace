/**
 * Model Router — maps API route keys to model tiers.
 *
 * This file is purely a routing table. It answers "which tier handles this route?"
 * The tier then resolves to a full inference profile via model-config.ts.
 *
 * Routing hierarchy:
 *   Route Key → ModelTier → InferenceProfile (model + all params)
 */

import type { ModelTier } from "./model-config";

/**
 * Maps API route paths (or logical task names) to model tiers.
 */
const ROUTE_TO_TIER: Record<string, ModelTier> = {
  // ─── Teaching / General ───────────────────────────────────────────
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
  "ai/problem/generate-test-cases": "teaching",
  "ai/assessment/generate": "teaching",
  "ai/assessment/evaluate": "teaching",
  "ai/assessment/feedback": "teaching",
  "ai/assessment/content-update": "teaching",
  "quick-create": "teaching",

  // ─── Coding ───────────────────────────────────────────────────────
  "ai/coding-interview/evaluate": "coding",
  "ai/coding-interview/follow-up": "coding",
  "ai/coding-interview/generate-problem": "coding",
  "ai/coding-interview/hint": "coding",
  "ai/coding-interview/score": "coding",
  "ai/coding-interview/validate-test-cases": "coding",
  "ai/problem/evaluate-solution": "coding",
  "ai/problem/validate-test-cases": "coding",

  // ─── Fast / Utility ───────────────────────────────────────────────
  "ai/enhance-prompt": "fast",
  "ai/parse-form": "fast",
  "ai/status": "fast",
  "ai/quick-chat": "fast",
  "ai/quick-chat/summarize": "fast",
};

/**
 * Resolves the model tier for a given route key.
 * Defaults to "teaching" for unknown routes.
 */
export function getTierForRoute(routeKey: string): ModelTier {
  return ROUTE_TO_TIER[routeKey] ?? "teaching";
}
