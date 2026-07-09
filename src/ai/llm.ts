/**
 * High-level LLM access — combines model routing, model management, and client creation.
 *
 * This is the primary entry point for AI routes. It:
 * 1. Resolves the correct model for the route via the model router
 * 2. Ensures that model is loaded in LM Studio via the management API
 * 3. Returns a ready-to-use AIClient configured for that model
 *
 * Usage:
 * ```ts
 * import { getReadyClient } from "@/ai/llm";
 *
 * const client = await getReadyClient("ai/generate-artifact");
 * for await (const chunk of client.generate(prompt)) { ... }
 * ```
 */

import { createAIClient, type AIClient } from "./client";
import { getModelForRoute, getModel, type ModelTier } from "./model-router";
import { ensureModelLoaded } from "./model-manager";
import { logger } from "../lib/logger";

const DEFAULT_BASE_URL =
  process.env.OPENAI_BASE_URL || "http://127.0.0.1:1234/v1";
const API_KEY = process.env.OPENAI_API_KEY || "";

/**
 * Returns a ready-to-use AIClient for the given route key.
 * Ensures the appropriate model is loaded in LM Studio before returning.
 *
 * @param routeKey - The API route identifier (e.g., "ai/generate-artifact")
 * @throws If the model fails to load (callers should handle gracefully)
 */
export async function getReadyClient(routeKey: string): Promise<AIClient> {
  const model = getModelForRoute(routeKey);

  try {
    await ensureModelLoaded(model);
  } catch (err) {
    logger.info(
      "llm",
      `Model load failed for ${model}: ${err instanceof Error ? err.message : String(err)}. Proceeding anyway — model may already be available.`,
    );
  }

  return createAIClient({
    baseUrl: DEFAULT_BASE_URL,
    apiKey: API_KEY,
    defaultModel: model,
  });
}

/**
 * Returns a ready-to-use AIClient for a specific model tier.
 * Useful when the caller knows the task category but not the route key.
 *
 * @param tier - "teaching" | "coding" | "fast"
 */
export async function getReadyClientForTier(tier: ModelTier): Promise<AIClient> {
  const model = getModel(tier);

  try {
    await ensureModelLoaded(model);
  } catch (err) {
    logger.info(
      "llm",
      `Model load failed for ${model}: ${err instanceof Error ? err.message : String(err)}. Proceeding anyway.`,
    );
  }

  return createAIClient({
    baseUrl: DEFAULT_BASE_URL,
    apiKey: API_KEY,
    defaultModel: model,
  });
}

/**
 * Returns the resolved model name for a route without loading it.
 * Useful for logging or display purposes.
 */
export function getModelNameForRoute(routeKey: string): string {
  return getModelForRoute(routeKey);
}
