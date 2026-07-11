/**
 * OpenAI-compatible client for communicating with an AI model server.
 *
 * The client connects to any OpenAI-compatible API (OpenAI, AI Studio,
 * LM Studio, vLLM, etc.) and exposes:
 * - `isAvailable()`: health check returning true if the server responds
 * - `generate()`: async generator that streams response tokens via SSE
 *
 * Requirements: 6.1, 6.4
 */

import { logInput, logOutput, logError } from "./logger";
import { addLogEntry, emitStreamChunk } from "./log-store";
import { logger } from "../lib/logger";
import type { ModelConfig } from "./config";

/**
 * Inference parameters that can be passed per-request.
 * These map to the OpenAI chat completions API (with local extensions).
 */
export interface InferenceParams {
  model?: string;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  max_tokens?: number;
  repeat_penalty?: number;
  stream?: boolean;
}

/**
 * Token usage stats from the last generate() call.
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AIClient {
  isAvailable(): Promise<boolean>;
  generate(prompt: string, params?: InferenceParams): AsyncGenerator<string>;
  /** Returns token usage from the last completed generate() call, or null if unavailable */
  getLastUsage(): TokenUsage | null;
}

export interface AIClientOptions {
  baseUrl: string;
  apiKey?: string;
  /** Default inference params applied to every request (can be overridden per-call) */
  defaults?: InferenceParams;
}

/**
 * Creates an AIClient connected to an OpenAI-compatible API.
 *
 * @param options - Configuration for the AI client
 * @param options.baseUrl - The API base URL (e.g., "http://127.0.0.1:1234/v1")
 * @param options.apiKey - Optional API key for authentication
 * @param options.defaults - Default inference params (model, temperature, etc.)
 */
export function createAIClient(options: AIClientOptions): AIClient {
  const { baseUrl, apiKey, defaults = {} } = options;
  let lastUsage: TokenUsage | null = null;

  return {
    getLastUsage(): TokenUsage | null {
      return lastUsage;
    },

    async isAvailable(): Promise<boolean> {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${baseUrl}/models`, {
          signal: controller.signal,
          headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
        });

        clearTimeout(timeoutId);
        return response.ok;
      } catch {
        return false;
      }
    },

    async *generate(
      prompt: string,
      params?: InferenceParams,
    ): AsyncGenerator<string> {
      // Merge: defaults (from tier config) → per-call overrides
      const merged: InferenceParams = { ...defaults, ...params };
      const model = merged.model ?? "gpt-3.5-turbo";
      const stream = merged.stream ?? true;

      // Reset usage for this generation
      lastUsage = null;

      logInput(prompt, model);
      let fullResponse = "";

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (apiKey) {
          headers["Authorization"] = `Bearer ${apiKey}`;
        }

        // Build the request body with all inference parameters
        const body: Record<string, unknown> = {
          model,
          messages: [{ role: "user", content: prompt }],
          stream,
        };

        // Request usage stats in streaming mode (OpenAI-compatible extension)
        if (stream) {
          body.stream_options = { include_usage: true };
        }

        // Only include params that are explicitly set (avoid sending undefined)
        if (merged.temperature !== undefined) body.temperature = merged.temperature;
        if (merged.top_p !== undefined) body.top_p = merged.top_p;
        if (merged.max_tokens !== undefined) body.max_tokens = merged.max_tokens;
        // Local inference server extensions (LM Studio, llama.cpp, Ollama)
        if (merged.top_k !== undefined) body.top_k = merged.top_k;
        if (merged.repeat_penalty !== undefined) body.repeat_penalty = merged.repeat_penalty;

        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
        });

        if (!response.ok || !response.body) {
          logError(prompt, `no response (status: ${response.status})`);
          return;
        }

        // Non-streaming mode: read the full response at once
        if (!stream) {
          const data = (await response.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
            usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
          };
          const content = data.choices?.[0]?.message?.content ?? "";
          if (data.usage) {
            lastUsage = {
              promptTokens: data.usage.prompt_tokens ?? 0,
              completionTokens: data.usage.completion_tokens ?? 0,
              totalTokens: data.usage.total_tokens ?? 0,
            };
          }
          if (content) {
            fullResponse = content;
            yield content;
          }
          logOutput(prompt, fullResponse);
          addLogEntry(prompt, fullResponse, model);
          return;
        }

        // Streaming mode: parse SSE
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          // Keep the last partial line in the buffer
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;

            const data = trimmed.slice(6);
            if (data === "[DONE]") {
              logOutput(prompt, fullResponse);
              addLogEntry(prompt, fullResponse, model);
              return;
            }

            try {
              const parsed = JSON.parse(data) as {
                choices?: Array<{ delta?: { content?: string } }>;
                usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
              };
              // Capture usage from the final chunk (when stream_options.include_usage is set)
              if (parsed.usage) {
                lastUsage = {
                  promptTokens: parsed.usage.prompt_tokens ?? 0,
                  completionTokens: parsed.usage.completion_tokens ?? 0,
                  totalTokens: parsed.usage.total_tokens ?? 0,
                };
              }
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullResponse += content;
                emitStreamChunk(prompt, content, model);
                yield content;
              }
            } catch {
              // Skip malformed SSE lines
            }
          }
        }

        // Process any remaining buffer content
        if (buffer.trim()) {
          const trimmed = buffer.trim();
          if (trimmed.startsWith("data: ") && trimmed.slice(6) !== "[DONE]") {
            try {
              const parsed = JSON.parse(trimmed.slice(6)) as {
                choices?: Array<{ delta?: { content?: string } }>;
                usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
              };
              if (parsed.usage) {
                lastUsage = {
                  promptTokens: parsed.usage.prompt_tokens ?? 0,
                  completionTokens: parsed.usage.completion_tokens ?? 0,
                  totalTokens: parsed.usage.total_tokens ?? 0,
                };
              }
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullResponse += content;
                emitStreamChunk(prompt, content, model);
                yield content;
              }
            } catch {
              // Skip malformed trailing content
            }
          }
        }

        logOutput(prompt, fullResponse);
        addLogEntry(prompt, fullResponse, model);
      } catch {
        logError(prompt, "connection failed");
        return;
      }
    },
  };
}

/**
 * Helper: convert a ModelConfig to InferenceParams for the client.
 */
export function modelConfigToParams(config: ModelConfig): InferenceParams {
  return {
    model: config.model,
    temperature: config.temperature,
    top_p: config.topP,
    top_k: config.topK,
    max_tokens: config.maxTokens,
    repeat_penalty: config.repeatPenalty,
    stream: config.stream,
  };
}
