/**
 * AI-powered content summarization.
 *
 * Streams a summary of the provided content as an async generator,
 * yielding string chunks as they arrive from the model.
 *
 * Requirements: 5.1
 */

import type { AIClient } from "./client";
import { buildSummaryPrompt } from "./prompts";

/**
 * Generates a streaming summary of the given content.
 *
 * @param content - The text content to summarize
 * @param client - The AIClient instance to use
 * @yields String chunks of the generated summary
 */
export async function* generateSummary(
  content: string,
  client: AIClient,
): AsyncGenerator<string> {
  const available = await client.isAvailable();
  if (!available) {
    yield "AI is currently unavailable. Please check your AI service configuration.";
    return;
  }

  const prompt = buildSummaryPrompt(content);

  try {
    for await (const chunk of client.generate(prompt)) {
      yield chunk;
    }
  } catch {
    yield "\n\n[Error: Summary generation failed. Please try again.]";
  }
}
