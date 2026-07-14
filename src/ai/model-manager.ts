/**
 * Model Manager — ensures only one model is loaded at a time.
 *
 * With LM Studio 0.4.19+, inference requests JIT-load models automatically
 * (via the `ttl` field). However, on memory-constrained devices we want to
 * explicitly unload the previous model BEFORE the new inference request so
 * that only one model occupies memory at any point.
 *
 * Flow when switching models:
 *   1. Detect that the requested model differs from the currently loaded one.
 *   2. Unload all loaded instances via POST /api/v1/models/unload.
 *   3. Let the inference request JIT-load the new model (with `ttl`).
 *
 * API Reference: https://lmstudio.ai/docs/developer/rest
 */

import { logger } from "../lib/logger";

/** Base URL for LM Studio management API (same host, different path) */
const LM_STUDIO_BASE =
  process.env.OPENAI_BASE_URL?.replace("/v1", "") || "http://127.0.0.1:1234";

const MANAGEMENT_API = `${LM_STUDIO_BASE}/api/v1/models`;

/** Timeout for unload/list requests */
const DEFAULT_TIMEOUT_MS = 10_000;

// ─── Types ──────────────────────────────────────────────────────────────────

interface LoadedInstance {
  id: string;
  config: {
    context_length: number;
  };
}

interface ModelInfo {
  type: "llm" | "embedding";
  key: string;
  display_name: string;
  loaded_instances: LoadedInstance[];
}

interface ListModelsResponse {
  models: ModelInfo[];
}

// ─── Model Manager ──────────────────────────────────────────────────────────

class ModelManager {
  private currentModel: string | null = null;
  private switching: Promise<void> | null = null;

  /**
   * Returns the model currently tracked as active, or null.
   */
  getCurrentModel(): string | null {
    return this.currentModel;
  }

  /**
   * Called by the inference queue to track which model is being used.
   */
  setCurrentModel(model: string | null): void {
    this.currentModel = model;
  }

  /**
   * Ensures that no OTHER model is loaded before we send an inference request.
   * If the requested model matches what we last used, skips the check entirely
   * (trusting that it's either still loaded or will JIT-load via ttl).
   * If a different model is requested, queries LM Studio and unloads the old one.
   *
   * Uses a lock to prevent concurrent unload races.
   */
  async ensureUnloaded(requestedModel: string): Promise<void> {
    // Fast path: same model as last request — skip network check.
    // If it was TTL-unloaded, JIT will reload it on the inference request.
    if (this.currentModel === requestedModel) {
      return;
    }

    // If a switch is already in progress, wait for it
    if (this.switching) {
      await this.switching;
      if (this.currentModel === requestedModel) {
        return;
      }
    }

    // Start the unload sequence
    this.switching = this._prepareForModel(requestedModel);
    try {
      await this.switching;
    } finally {
      this.switching = null;
    }
  }

  /**
   * Queries LM Studio for all models and returns those with loaded instances.
   * Useful for the /api/ai/status endpoint.
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
   * Call on startup to detect if a model was already loaded externally.
   */
  async sync(): Promise<void> {
    try {
      const models = await this._listModels();
      const loaded = models.filter((m) => m.loaded_instances.length > 0);
      if (loaded.length > 0) {
        this.currentModel = loaded[0].key;
        logger.info("model-manager", `Synced: ${this.currentModel} is loaded`);
      } else {
        this.currentModel = null;
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

  /**
   * Checks what's actually loaded in LM Studio and unloads anything that
   * isn't the requested model. This handles:
   * - Different model loaded → unload it (free memory for JIT)
   * - Same model loaded → no-op
   * - Nothing loaded (TTL expired) → reset tracking, JIT will handle it
   */
  private async _prepareForModel(requestedModel: string): Promise<void> {
    try {
      const models = await this._listModels();
      const loadedInstances: { id: string; key: string }[] = [];

      for (const model of models) {
        for (const instance of model.loaded_instances) {
          loadedInstances.push({ id: instance.id, key: model.key });
        }
      }

      // Nothing loaded — reset tracking, JIT will load the requested model
      if (loadedInstances.length === 0) {
        this.currentModel = null;
        logger.info(
          "model-manager",
          `No models loaded — JIT will load ${requestedModel}`,
        );
        return;
      }

      // Check if the requested model is already the only one loaded
      const allAreRequestedModel = loadedInstances.every(
        (i) => i.key === requestedModel,
      );
      if (allAreRequestedModel) {
        this.currentModel = requestedModel;
        logger.info(
          "model-manager",
          `Requested model already loaded: ${requestedModel}`,
        );
        return;
      }

      // Different model(s) loaded — unload everything to free memory
      logger.info(
        "model-manager",
        `Unloading ${loadedInstances.length} instance(s) before switching to ${requestedModel}`,
      );

      for (const instance of loadedInstances) {
        await this._unload(instance.id);
      }

      this.currentModel = null;
    } catch (err) {
      // Non-fatal — the inference request will still work (JIT handles it)
      logger.info(
        "model-manager",
        `Prepare failed: ${err instanceof Error ? err.message : String(err)}. Proceeding with inference.`,
      );
    }
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

  private async _unload(instanceId: string): Promise<void> {
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

      logger.info("model-manager", `Unloaded instance: ${instanceId}`);
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
 * @deprecated Use modelManager.ensureUnloaded() directly.
 * Kept for backward compatibility — now just triggers unload of other models.
 */
export async function ensureModelLoaded(
  model: string,
  _contextLength?: number,
): Promise<void> {
  await modelManager.ensureUnloaded(model);
}
