/**
 * High-level LLM access — combines inference config, model management, and client creation.
 *
 * This is the primary entry point for AI routes. It:
 * 1. Resolves the full inference profile for the route (model + all params)
 * 2. Ensures that model is loaded in LM Studio via the management API
 * 3. Returns a ready-to-use AIClient configured with the correct inference params
 *
 * Usage:
 * ```ts
 * import { getReadyClient } from "@/ai/llm";
 *
 * // Basic — uses tier defaults for temperature, maxTokens, etc.
 * const client = await getReadyClient("ai/generate-artifact");
 * for await (const chunk of client.generate(prompt)) { ... }
 *
 * // With overrides — bump context for a large prompt
 * const client = await getReadyClient("ai/coding-interview/evaluate", {
 *   contextLength: 32_768,
 *   maxTokens: 8_192,
 * });
 * ```
 */

import { createAIClient, modelConfigToParams, type AIClient } from "./client";
import {
  resolveInference,
  resolveInferenceForTier,
  type ModelTier,
  type ModelConfig,
} from "./config";
import { ensureModelLoaded } from "./model-manager";
import { logger } from "../lib/logger";

const DEFAULT_BASE_URL =
  process.env.OPENAI_BASE_URL || "http://127.0.0.1:1234/v1";
const API_KEY = process.env.OPENAI_API_KEY || "";

/**
 * Returns a ready-to-use AIClient for the given route key.
 * Resolves the full inference profile and ensures the model is loaded.
 *
 * @param routeKey - The API route identifier (e.g., "ai/generate-artifact")
 * @param overrides - Optional overrides for any inference parameter
 * @throws If the model fails to load (callers should handle gracefully)
 */
export async function getReadyClient(
  routeKey: string,
  overrides?: Partial<ModelConfig>,
): Promise<AIClient> {
  const config = resolveInference(routeKey, overrides);

  try {
    await ensureModelLoaded(config.model, config.contextLength);
  } catch (err) {
    logger.info(
      "llm",
      `Model load failed for ${config.model}: ${err instanceof Error ? err.message : String(err)}. Proceeding anyway — model may already be available.`,
    );
  }

  return createAIClient({
    baseUrl: DEFAULT_BASE_URL,
    apiKey: API_KEY,
    defaults: modelConfigToParams(config),
  });
}

/**
 * Returns a ready-to-use AIClient for a specific model tier.
 * Useful when the caller knows the task category but not the route key.
 *
 * @param tier - "teaching" | "coding" | "fast"
 * @param overrides - Optional overrides for any inference parameter
 */
export async function getReadyClientForTier(
  tier: ModelTier,
  overrides?: Partial<ModelConfig>,
): Promise<AIClient> {
  const config = resolveInferenceForTier(tier, overrides);

  try {
    await ensureModelLoaded(config.model, config.contextLength);
  } catch (err) {
    logger.info(
      "llm",
      `Model load failed for ${config.model}: ${err instanceof Error ? err.message : String(err)}. Proceeding anyway.`,
    );
  }

  return createAIClient({
    baseUrl: DEFAULT_BASE_URL,
    apiKey: API_KEY,
    defaults: modelConfigToParams(config),
  });
}

/**
 * Returns the resolved model name for a route without loading it.
 * Useful for logging or display purposes.
 */
export function getModelNameForRoute(routeKey: string): string {
  return resolveInference(routeKey).model;
}

/**
 * Returns the full inference config for a route (for debugging/status).
 */
export function getInferenceConfigForRoute(
  routeKey: string,
  overrides?: Partial<ModelConfig>,
): ModelConfig {
  return resolveInference(routeKey, overrides);
}
