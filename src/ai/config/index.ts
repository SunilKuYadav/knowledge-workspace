/**
 * AI Config — barrel export for the inference configuration system.
 *
 * Architecture:
 *   model-router.ts      → route key → tier
 *   model-config.ts      → tier → inference settings
 *   context-profiles.ts  → named context window presets (4K/8K/16K/32K)
 *   model-capabilities.ts → per-model feature flags (vision, tools, JSON, reasoning)
 *   runtime.ts           → builds the final request config
 */

export { CONTEXT_PROFILE, type ContextProfileKey } from "./context-profiles";
export {
  MODEL_CONFIG,
  getInferenceConfig,
  type ModelTier,
  type ModelConfig,
} from "./model-config";
export { getTierForRoute } from "./model-router";
export { getModelCapabilities, type ModelCapabilities } from "./model-capabilities";
export {
  resolveInference,
  resolveInferenceForTier,
  toRequestParams,
  type InferenceRequest,
} from "./runtime";
