/**
 * AI-powered flashcard generation.
 *
 * Generates flashcards from provided content, parsing the model's
 * JSON response and returning validated Flashcard objects.
 * Returns an empty array on failure.
 *
 * Requirements: 5.3
 */

import type { Flashcard } from '@/types';
import type { AIClient } from './client';
import { buildFlashcardsPrompt } from './prompts';

/**
 * Generates flashcards from the given content.
 *
 * @param content - The text content to generate flashcards from
 * @param client - The AIClient instance to use
 * @returns Array of Flashcard objects, or empty array on failure
 */
export async function generateFlashcards(
  content: string,
  client: AIClient
): Promise<Flashcard[]> {
  try {
    const available = await client.isAvailable();
    if (!available) {
      return [];
    }

    const prompt = buildFlashcardsPrompt(content);

    let fullResponse = '';
    for await (const chunk of client.generate(prompt)) {
      fullResponse += chunk;
    }

    const parsed = extractJsonArray(fullResponse);
    if (!parsed) {
      return [];
    }

    return validateFlashcards(parsed);
  } catch {
    return [];
  }
}

/**
 * Attempts to extract a JSON array from a response string.
 */
function extractJsonArray(response: string): unknown[] | null {
  try {
    const trimmed = response.trim();
    const directParse = JSON.parse(trimmed);
    if (Array.isArray(directParse)) {
      return directParse;
    }
  } catch {
    // Fall through
  }

  const codeBlockMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1].trim());
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Fall through
    }
  }

  const arrayMatch = response.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Give up
    }
  }

  return null;
}

/**
 * Validates parsed items as Flashcard-compatible objects.
 * Generates placeholder IDs and timestamps since these come from AI.
 */
function validateFlashcards(items: unknown[]): Flashcard[] {
  const valid: Flashcard[] = [];

  for (const item of items) {
    if (
      item &&
      typeof item === 'object' &&
      'front' in item &&
      'back' in item
    ) {
      const f = item as Record<string, unknown>;
      if (typeof f.front === 'string' && typeof f.back === 'string') {
        const tags = Array.isArray(f.tags)
          ? (f.tags as unknown[]).filter((t): t is string => typeof t === 'string')
          : [];

        valid.push({
          id: crypto.randomUUID(),
          front: f.front,
          back: f.back,
          tags,
          topicId: '',
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  return valid;
}
