/**
 * OpenAI-compatible client for communicating with an AI model server.
 *
 * The client connects to any OpenAI-compatible API (OpenAI, Ollama with
 * OpenAI compatibility, LM Studio, vLLM, etc.) and exposes:
 * - `isAvailable()`: health check returning true if the server responds
 * - `generate()`: async generator that streams response tokens via SSE
 *
 * Requirements: 6.1, 6.4
 */

import { logInput, logOutput, logError } from './logger';
import { addLogEntry, emitStreamChunk } from './log-store';
import { logger } from '../lib/logger';

export interface AIClient {
  isAvailable(): Promise<boolean>;
  generate(prompt: string, model?: string): AsyncGenerator<string>;
}

export interface AIClientOptions {
  baseUrl: string;
  apiKey?: string;
  defaultModel?: string;
}

/**
 * Creates an AIClient connected to an OpenAI-compatible API.
 *
 * @param options - Configuration for the AI client
 * @param options.baseUrl - The API base URL (e.g., "https://api.openai.com/v1" or "http://localhost:11434/v1")
 * @param options.apiKey - Optional API key for authentication
 * @param options.defaultModel - Default model to use (defaults to "gpt-3.5-turbo")
 */
export function createAIClient(options: AIClientOptions): AIClient {
  const { baseUrl, apiKey, defaultModel = 'gpt-3.5-turbo' } = options;

  return {
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

    async *generate(prompt: string, model: string = defaultModel): AsyncGenerator<string> {
      logInput(prompt, model);
      let fullResponse = '';

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (apiKey) {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: prompt }],
            stream: true,
          }),
        });

        if (!response.ok || !response.body) {
          logError(prompt, `no response (status: ${response.status})`);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          // Keep the last partial line in the buffer
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;

            const data = trimmed.slice(6);
            if (data === '[DONE]') {
              logOutput(prompt, fullResponse);
              addLogEntry(prompt, fullResponse, model);
              return;
            }

            try {
              const parsed = JSON.parse(data) as {
                choices?: Array<{ delta?: { content?: string } }>;
              };
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
          if (trimmed.startsWith('data: ') && trimmed.slice(6) !== '[DONE]') {
            try {
              const parsed = JSON.parse(trimmed.slice(6)) as {
                choices?: Array<{ delta?: { content?: string } }>;
              };
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
        logError(prompt, 'connection failed');
        return;
      }
    },
  };
}

/**
 * @deprecated Use createAIClient instead. This is a compatibility alias.
 */
export const createOllamaClient = (baseUrl: string): AIClient => {
  // Convert old Ollama base URL to OpenAI-compatible format
  // Ollama supports OpenAI-compatible API at /v1
  const openaiBaseUrl = baseUrl.endsWith('/v1') ? baseUrl : `${baseUrl}/v1`;
  return createAIClient({ baseUrl: openaiBaseUrl, defaultModel: 'llama3' });
};

/**
 * @deprecated Use AIClient instead.
 */
export type OllamaClient = AIClient;
