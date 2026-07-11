/**
 * Model Router — BACKWARD COMPATIBILITY LAYER.
 *
 * This file is kept for existing imports. The real implementation
 * now lives in src/ai/config/model-router.ts + model-config.ts.
 *
 * Prefer importing from "@/ai/config" or "@/ai" directly.
 */

export type { ModelTier } from "./config";
import { resolveInference, resolveInferenceForTier, type ModelTier } from "./config";

/**
 * @deprecated Use `resolveInference(routeKey)` from "@/ai/config" instead.
 * Returns just the model name for backward compatibility.
 */
export function getModelForRoute(routeKey: string): string {
  return resolveInference(routeKey).model;
}

/**
 * @deprecated Use `resolveInferenceForTier(tier)` from "@/ai/config" instead.
 */
export function getModel(tier: ModelTier): string {
  return resolveInferenceForTier(tier).model;
}

/**
 * Returns all configured models for debugging/status display.
 */
export function getAllModels(): Record<ModelTier, string> {
  return {
    teaching: resolveInferenceForTier("teaching").model,
    coding: resolveInferenceForTier("coding").model,
    fast: resolveInferenceForTier("fast").model,
  };
}
