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
import { aiServerQueue } from "./queue";
import { logger } from "../lib/logger";

const DEFAULT_BASE_URL =
  process.env.OPENAI_BASE_URL || "http://127.0.0.1:1234/v1";
const API_KEY = process.env.OPENAI_API_KEY || "";

/**
 * Returns a ready-to-use AIClient for the given route key.
 * Resolves the full inference profile and ensures the model is loaded.
 * The returned client's generate() method is queued — only one AI inference
 * runs at a time across the entire server process.
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

  // Return a queued client — generate() will wait for its turn in the queue
  return createQueuedClient(routeKey, config);
}

/**
 * Returns a ready-to-use AIClient for a specific model tier.
 * Useful when the caller knows the task category but not the route key.
 * The returned client's generate() method is queued.
 *
 * @param tier - "teaching" | "coding" | "fast"
 * @param overrides - Optional overrides for any inference parameter
 */
export async function getReadyClientForTier(
  tier: ModelTier,
  overrides?: Partial<ModelConfig>,
): Promise<AIClient> {
  const config = resolveInferenceForTier(tier, overrides);

  return createQueuedClient(`tier/${tier}`, config);
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

/**
 * Creates an AIClient whose generate() calls go through the server-side queue.
 * This ensures only one LLM inference runs at a time, and handles model switching
 * (loading/unloading) automatically before each request.
 *
 * Streaming is preserved: chunks are forwarded through an async channel
 * so the caller receives them in real-time while still respecting the queue.
 */
function createQueuedClient(routeKey: string, config: ModelConfig): AIClient {
  const rawClient = createAIClient({
    baseUrl: DEFAULT_BASE_URL,
    apiKey: API_KEY,
    defaults: modelConfigToParams(config),
  });

  return {
    // isAvailable doesn't need queuing — it's a lightweight health check
    isAvailable: () => rawClient.isAvailable(),

    // Delegate to raw client's usage tracking
    getLastUsage: () => rawClient.getLastUsage(),

    // generate() goes through the queue with streaming preserved
    async *generate(prompt, params) {
      // Async channel: the queue task pushes chunks, the generator yields them
      const chunks: string[] = [];
      let done = false;
      let error: unknown = null;
      let resolve: (() => void) | null = null;

      // Signal to wake the consumer when new chunks arrive or generation finishes
      function notify() {
        if (resolve) {
          const r = resolve;
          resolve = null;
          r();
        }
      }

      // Wait for a notification (new chunk available or done)
      function waitForNotify(): Promise<void> {
        return new Promise<void>((r) => {
          resolve = r;
        });
      }

      const label = `${routeKey} (${prompt.slice(0, 60).replace(/\n/g, " ")}...)`;

      // The queue task runs the actual generation and pushes chunks
      const { promise, id } = aiServerQueue.enqueue(
        routeKey,
        label,
        config.model,
        async (_signal) => {
          // Ensure the model is loaded before inference
          try {
            await ensureModelLoaded(config.model, config.contextLength);
            aiServerQueue.setCurrentModel(config.model);
          } catch (err) {
            logger.info(
              "llm",
              `Model load failed for ${config.model}: ${err instanceof Error ? err.message : String(err)}. Proceeding anyway.`,
            );
          }

          // Run the actual generation and push chunks to the channel
          for await (const chunk of rawClient.generate(prompt, params)) {
            chunks.push(chunk);
            notify();
          }

          // Capture token usage after generation completes
          const usage = rawClient.getLastUsage();
          if (usage) {
            aiServerQueue.setTokenUsage(id, usage);
          }

          done = true;
          notify();
        },
      );

      // Handle queue-level errors
      promise.catch((err) => {
        error = err;
        done = true;
        notify();
      });

      // Consumer: yield chunks as they arrive
      let cursor = 0;
      while (true) {
        // Yield any buffered chunks
        while (cursor < chunks.length) {
          yield chunks[cursor];
          cursor++;
        }

        // Check if we're done
        if (done && cursor >= chunks.length) {
          if (error) throw error;
          return;
        }

        // Wait for more chunks
        await waitForNotify();
      }
    },
  };
}
