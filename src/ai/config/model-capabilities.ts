/**
 * Model Capabilities — declares what each model supports.
 *
 * As you add models with different feature sets (vision, tool calling,
 * structured JSON output, reasoning tokens), this registry lets the
 * system make intelligent decisions without hardcoding model names
 * throughout the codebase.
 */

export interface ModelCapabilities {
  /** Supports vision/image input */
  vision: boolean;
  /** Supports tool/function calling */
  tools: boolean;
  /** Supports native JSON mode (structured output) */
  jsonMode: boolean;
  /** Supports reasoning/chain-of-thought tokens */
  reasoning: boolean;
  /** Supports embedding generation */
  embedding: boolean;
}

const DEFAULT_CAPABILITIES: ModelCapabilities = {
  vision: false,
  tools: false,
  jsonMode: false,
  reasoning: false,
  embedding: false,
};

/**
 * Known model capabilities.
 * Add entries as you onboard new models.
 */
const MODEL_CAPABILITIES: Record<string, Partial<ModelCapabilities>> = {
  "qwen3-30b-a3b-mlx": {
    reasoning: true,
  },
  "qwen3-coder-30b-a3b-instruct-mlx": {
    tools: true,
    reasoning: true,
  },
  "qwen2.5-coder-14b-instruct": {
    tools: true,
  },
};

/**
 * Returns the capabilities for a given model name.
 * Unknown models get the conservative default (all false).
 */
export function getModelCapabilities(model: string): ModelCapabilities {
  const known = MODEL_CAPABILITIES[model];
  if (!known) return { ...DEFAULT_CAPABILITIES };
  return { ...DEFAULT_CAPABILITIES, ...known };
}
