/**
 * Model Config — tier-based inference profiles.
 *
 * Each tier defines a complete inference profile:
 * - model: which model to load
 * - contextLength: how much context to allocate on load
 * - temperature: creativity vs determinism
 * - topP / topK: nucleus/top-k sampling
 * - repeatPenalty: anti-repetition
 * - maxTokens: output length budget
 * - stream: whether to stream responses
 *
 * These values are tuned for Apple M4 24GB running local models via LM Studio.
 * Adjust as needed for your hardware.
 */

import { CONTEXT_PROFILE } from "./context-profiles";

export type ModelTier = "teaching" | "coding" | "fast";

export interface ModelConfig {
  /** Model identifier (as registered in LM Studio or OpenAI API) */
  model: string;

  /** Context window size to allocate when loading the model */
  contextLength: number;

  /** Sampling temperature — higher = more creative, lower = more deterministic */
  temperature: number;

  /** Nucleus sampling — cumulative probability cutoff */
  topP: number;

  /** Top-K sampling — number of top tokens to consider */
  topK: number;

  /** Repetition penalty — >1.0 penalizes repeated tokens */
  repeatPenalty: number;

  /** Maximum tokens to generate in a single response */
  maxTokens: number;

  /** Whether to stream the response token-by-token */
  stream: boolean;
}

/**
 * Default inference profiles per tier.
 *
 * Teaching: Creative generation (notes, artifacts, study plans, assessments)
 *   - Higher temperature for varied, engaging explanations
 *   - Large context for system prompt + content + reasoning
 *
 * Coding: Deterministic code generation (interview, code review, evaluation)
 *   - Low temperature to reduce hallucinated APIs and produce consistent code
 *   - Higher maxTokens — code responses tend to be longer
 *
 * Fast: Lightweight utility (prompt enhancement, parsing, classification)
 *   - Small context — these tasks don't need large windows
 *   - Low maxTokens — responses are short extractions/transformations
 */
export const MODEL_CONFIG: Record<ModelTier, ModelConfig> = {
  teaching: {
    model:
      process.env.OPENAI_MODEL_TEACHING ??
      process.env.OPENAI_MODEL ??
      "qwen3-30b-a3b-mlx",

    contextLength: CONTEXT_PROFILE.LARGE,

    temperature: 0.7,
    topP: 0.9,
    topK: 40,

    repeatPenalty: 1.05,

    maxTokens: 4_096,

    stream: true,
  },

  coding: {
    model:
      process.env.OPENAI_MODEL_CODING ??
      process.env.OPENAI_MODEL ??
      "qwen3-coder-30b-a3b-instruct-mlx",

    contextLength: CONTEXT_PROFILE.LARGE,

    temperature: 0.15,
    topP: 0.9,
    topK: 40,

    repeatPenalty: 1.02,

    maxTokens: 5_144,

    stream: true,
  },

  fast: {
    model:
      process.env.OPENAI_MODEL_FAST ??
      process.env.OPENAI_MODEL ??
      "qwen2.5-coder-14b-instruct",

    contextLength: CONTEXT_PROFILE.SMALL,

    temperature: 0.2,
    topP: 0.9,
    topK: 20,

    repeatPenalty: 1.0,

    maxTokens: 2_048,

    stream: true,
  },
};

/**
 * Retrieve the full inference config for a tier, with optional overrides.
 *
 * Callers can override any field (e.g., bump contextLength for a
 * particularly large prompt, or disable streaming for a non-SSE route).
 */
export function getInferenceConfig(
  tier: ModelTier,
  overrides?: Partial<ModelConfig>,
): ModelConfig {
  return { ...MODEL_CONFIG[tier], ...overrides };
}

// | Setting               | Purpose                                | Why this value?                                            |
// | --------------------- | -------------------------------------- | ---------------------------------------------------------- |
// | `model`               | Select the coding-specialized model    | Better at code generation than a general model             |
// | `contextLength`       | Maximum prompt + response window       | Large enough for long system prompts, code, and history    |
// | `temperature: 0.15`   | Reduce randomness                      | Produces consistent, reliable code                         |
// | `topP: 0.9`           | Filter out unlikely token choices      | Keeps responses coherent without being overly restrictive  |
// | `topK: 40`            | Consider only the top candidate tokens | Balances quality and diversity                             |
// | `repeatPenalty: 1.02` | Discourage repetitive text             | Prevents loops while allowing necessary repetition in code |
// | `maxTokens: 6144`     | Maximum response length                | Accommodates full implementations, explanations, and tests |
// | `stream: true`        | Return tokens as they're generated     | Improves perceived responsiveness for the user             |
