/**
 * Model Manager — manages model lifecycle via LM Studio's REST management API.
 *
 * LM Studio exposes a management API at /api/v1/models that allows:
 * - Listing all models (with loaded_instances showing what's active)
 * - Loading a model into memory
 * - Unloading a model from memory
 *
 * This singleton ensures the correct model is loaded before inference requests
 * hit the OpenAI-compatible endpoint. It avoids unnecessary load/unload cycles
 * by tracking what's currently in memory.
 *
 * API Reference: https://lmstudio.ai/docs/developer/rest
 */

import { logger } from "../lib/logger";

/** Base URL for LM Studio management API (same host, different path) */
const LM_STUDIO_BASE =
  process.env.OPENAI_BASE_URL?.replace("/v1", "") || "http://127.0.0.1:1234";

const MANAGEMENT_API = `${LM_STUDIO_BASE}/api/v1/models`;

/** Timeout for load requests (models can take several seconds to load) */
const LOAD_TIMEOUT_MS = 120_000;

/** Timeout for list/unload requests */
const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Context lengths are now provided by the inference config system
 * (src/ai/config/model-config.ts) and passed as a parameter to ensure().
 * This removes the duplication of hardcoded values.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

interface LoadedInstance {
  id: string;
  config: {
    context_length: number;
    eval_batch_size?: number;
    parallel?: number;
    flash_attention?: boolean;
    num_experts?: number;
    offload_kv_cache_to_gpu?: boolean;
  };
}

interface ModelInfo {
  type: "llm" | "embedding";
  publisher: string;
  key: string;
  display_name: string;
  architecture?: string | null;
  quantization: { name: string | null; bits_per_weight: number | null } | null;
  size_bytes: number;
  params_string: string | null;
  loaded_instances: LoadedInstance[];
  max_context_length: number;
  format: "gguf" | "mlx" | null;
}

interface ListModelsResponse {
  models: ModelInfo[];
}

interface LoadModelResponse {
  type: "llm" | "embedding";
  instance_id: string;
  load_time_seconds: number;
  status: "loaded";
}

interface UnloadModelResponse {
  instance_id: string;
}

// ─── Model Manager Singleton ────────────────────────────────────────────────

class ModelManager {
  private currentModel: string | null = null;
  private currentContextLength: number | null = null;
  private loading: Promise<void> | null = null;

  /**
   * Ensures the specified model is loaded and ready for inference.
   * If the model is already loaded, this is a no-op.
   * If a different model is loaded, it will be unloaded first.
   *
   * @param model - Model identifier to load
   * @param contextLength - Context window size to allocate (from inference config)
   *
   * Uses a lock (promise) to prevent concurrent load/unload races.
   */
  async ensure(model: string, contextLength?: number): Promise<void> {
    // Fast path: already loaded with the same context length
    if (this.currentModel === model && this.currentContextLength === (contextLength ?? null)) {
      return;
    }

    // If a load is in progress, wait for it to finish then re-check
    if (this.loading) {
      await this.loading;
      if (this.currentModel === model && this.currentContextLength === (contextLength ?? null)) {
        return;
      }
    }

    // Start the load sequence
    this.loading = this._loadSequence(model, contextLength);
    try {
      await this.loading;
    } finally {
      this.loading = null;
    }
  }

  /**
   * Returns the model currently tracked as loaded, or null.
   */
  getCurrentModel(): string | null {
    return this.currentModel;
  }

  /**
   * Queries LM Studio for all models and returns those with loaded instances.
   */
  async getLoadedModels(): Promise<string[]> {
    try {
      const models = await this._listModels();
      return models
        .filter((m) => m.loaded_instances.length > 0)
        .map((m) => m.key);
    } catch {
      return [];
    }
  }

  /**
   * Syncs internal state with LM Studio's actual state.
   * Call this on startup to detect if a model was already loaded externally.
   */
  async sync(): Promise<void> {
    try {
      const models = await this._listModels();
      const loaded = models.filter((m) => m.loaded_instances.length > 0);
      if (loaded.length > 0) {
        this.currentModel = loaded[0].key;
        this.currentContextLength = loaded[0].loaded_instances[0]?.config.context_length ?? null;
        logger.info("model-manager", `Synced: ${this.currentModel} is loaded (ctx: ${this.currentContextLength})`);
      } else {
        this.currentModel = null;
        this.currentContextLength = null;
        logger.info("model-manager", "Synced: no models currently loaded");
      }
    } catch (err) {
      logger.info(
        "model-manager",
        `Sync failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // ─── Private ────────────────────────────────────────────────────────────

  private async _loadSequence(model: string, contextLength?: number): Promise<void> {
    // Check what's actually loaded in LM Studio
    const models = await this._listModels().catch(() => [] as ModelInfo[]);
    const loadedModels: string[] = [];
    for (const m of models) {
      for (const instance of m.loaded_instances) {
        loadedModels.push(instance.id);
      }
    }

    // Check if the target model is already loaded with the correct context length
    const targetModelInfo = models.find(
      (m) => m.key === model && m.loaded_instances.length > 0,
    );

    if (targetModelInfo && contextLength) {
      const instance = targetModelInfo.loaded_instances[0];
      if (instance.config.context_length === contextLength) {
        // Same model, same context — just update tracking
        this.currentModel = model;
        this.currentContextLength = contextLength;
        logger.info("model-manager", `Model already loaded with matching context: ${model} (ctx: ${contextLength})`);
        return;
      }
      // Same model but different context length — unload and reload
      logger.info(
        "model-manager",
        `Context length mismatch for ${model}: loaded=${instance.config.context_length}, requested=${contextLength}. Reloading.`,
      );
      await this._unload(instance.id);
    } else if (targetModelInfo) {
      // Model loaded, no specific context requested — accept as-is
      this.currentModel = model;
      this.currentContextLength = targetModelInfo.loaded_instances[0]?.config.context_length ?? null;
      logger.info("model-manager", `Model already loaded: ${model}`);
      return;
    }

    // Unload any other loaded models
    const remainingLoaded = await this._getLoadedInstanceIds();
    if (remainingLoaded.length > 0) {
      logger.info(
        "model-manager",
        `Unloading ${remainingLoaded.length} model(s) before loading ${model}: [${remainingLoaded.join(", ")}]`,
      );
      for (const instanceId of remainingLoaded) {
        await this._unload(instanceId);
      }
    }

    // Load the requested model
    await this._load(model, contextLength);
    this.currentModel = model;
    this.currentContextLength = contextLength ?? null;
  }

  private async _listModels(): Promise<ModelInfo[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(MANAGEMENT_API, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `List models failed: ${response.status} ${response.statusText}`,
        );
      }

      const data = (await response.json()) as ListModelsResponse;
      return data.models;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  private async _getLoadedInstanceIds(): Promise<string[]> {
    try {
      const models = await this._listModels();
      const ids: string[] = [];
      for (const model of models) {
        for (const instance of model.loaded_instances) {
          ids.push(instance.id);
        }
      }
      return ids;
    } catch {
      return [];
    }
  }

  private async _load(model: string, contextLength?: number): Promise<void> {
    logger.info("model-manager", `Loading model: ${model}`);
    const startTime = Date.now();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LOAD_TIMEOUT_MS);

    const body: Record<string, unknown> = { model };
    if (contextLength) {
      body.context_length = contextLength;
    }

    try {
      const response = await fetch(`${MANAGEMENT_API}/load`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const respBody = await response.text().catch(() => "");
        throw new Error(
          `Load model failed: ${response.status} ${response.statusText} — ${respBody}`,
        );
      }

      const data = (await response.json()) as LoadModelResponse;
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      logger.info(
        "model-manager",
        `Model loaded: ${data.instance_id} in ${elapsed}s (server reported ${data.load_time_seconds.toFixed(1)}s)${contextLength ? `, context: ${contextLength}` : ""}`,
      );
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  private async _unload(instanceId: string): Promise<void> {
    logger.info("model-manager", `Unloading model: ${instanceId}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(`${MANAGEMENT_API}/unload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instance_id: instanceId }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        logger.info(
          "model-manager",
          `Unload warning: ${response.status} — ${body}`,
        );
        return;
      }

      const data = (await response.json()) as UnloadModelResponse;
      logger.info("model-manager", `Unloaded: ${data.instance_id}`);
    } catch (err) {
      clearTimeout(timeoutId);
      logger.info(
        "model-manager",
        `Unload failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

// ─── Singleton Export ───────────────────────────────────────────────────────

export const modelManager = new ModelManager();

/**
 * Convenience function for use in API routes.
 * Ensures the model for a given route is loaded before inference.
 *
 * @param model - Model identifier to load
 * @param contextLength - Context window size (from inference config)
 *
 * @example
 * ```ts
 * import { ensureModelLoaded } from "@/ai";
 * import { resolveInference } from "@/ai/config";
 *
 * const config = resolveInference("ai/generate-artifact");
 * await ensureModelLoaded(config.model, config.contextLength);
 * // Now safe to call OpenAI-compatible endpoint
 * ```
 */
export async function ensureModelLoaded(model: string, contextLength?: number): Promise<void> {
  await modelManager.ensure(model, contextLength);
}
