/**
 * Runtime — builds the final inference request configuration.
 *
 * This is the single entry point that composes:
 *   route → tier → inference profile (with optional overrides)
 *
 * Usage:
 * ```ts
 * import { resolveInference } from "@/ai/config/runtime";
 *
 * const config = resolveInference("ai/generate-artifact");
 * // → { model, contextLength, temperature, topP, topK, repeatPenalty, maxTokens, stream }
 *
 * // With overrides:
 * const config = resolveInference("ai/coding-interview/evaluate", {
 *   contextLength: 32_768,
 *   maxTokens: 8_192,
 * });
 * ```
 */

import type { ModelConfig, ModelTier } from "./model-config";
import { getInferenceConfig } from "./model-config";
import { getTierForRoute } from "./model-router";

export interface InferenceRequest {
  /** Route key or tier — determines the base inference profile */
  routeKey?: string;
  tier?: ModelTier;
  /** Optional overrides for any inference parameter */
  overrides?: Partial<ModelConfig>;
}

/**
 * Resolves a complete inference configuration from a route key.
 *
 * @param routeKey - API route identifier (e.g., "ai/generate-artifact")
 * @param overrides - Optional parameter overrides
 * @returns Complete ModelConfig ready for the AI client
 */
export function resolveInference(
  routeKey: string,
  overrides?: Partial<ModelConfig>,
): ModelConfig {
  const tier = getTierForRoute(routeKey);
  return getInferenceConfig(tier, overrides);
}

/**
 * Resolves inference config directly from a tier.
 * Useful when the caller knows the task type but doesn't have a route key.
 */
export function resolveInferenceForTier(
  tier: ModelTier,
  overrides?: Partial<ModelConfig>,
): ModelConfig {
  return getInferenceConfig(tier, overrides);
}

/**
 * Convenience: extract only the OpenAI-compatible request body params
 * from a ModelConfig (excludes contextLength which is a load-time setting).
 */
export function toRequestParams(config: ModelConfig) {
  return {
    model: config.model,
    temperature: config.temperature,
    top_p: config.topP,
    max_tokens: config.maxTokens,
    stream: config.stream,
    // top_k and repeat_penalty are LM Studio / llama.cpp extensions
    // They're ignored by OpenAI but supported by local inference servers
    top_k: config.topK,
    repeat_penalty: config.repeatPenalty,
    // LM Studio JIT TTL — auto-unload after N seconds of inactivity
    ttl: config.ttl,
    // LM Studio JIT loading — context length to allocate
    context_length: config.contextLength,
  };
}
