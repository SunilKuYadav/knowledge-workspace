/**
 * AI-powered quiz generation.
 *
 * Generates multiple-choice quiz questions from provided content.
 * Parses the model's JSON response and validates the structure.
 * Returns an empty array on failure.
 *
 * Requirements: 5.2
 */

import type { AIClient } from './client';
import { buildQuizPrompt } from './prompts';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

/**
 * Generates quiz questions from the given content.
 *
 * @param content - The text content to generate quiz questions from
 * @param client - The AIClient instance to use
 * @returns Array of QuizQuestion objects, or empty array on failure
 */
export async function generateQuiz(
  content: string,
  client: AIClient
): Promise<QuizQuestion[]> {
  try {
    const available = await client.isAvailable();
    if (!available) {
      return [];
    }

    const prompt = buildQuizPrompt(content);

    let fullResponse = '';
    for await (const chunk of client.generate(prompt)) {
      fullResponse += chunk;
    }

    const parsed = extractJsonArray(fullResponse);
    if (!parsed) {
      return [];
    }

    return validateQuizQuestions(parsed);
  } catch {
    return [];
  }
}

/**
 * Attempts to extract a JSON array from a response string.
 * Handles cases where the model wraps JSON in markdown code blocks.
 */
function extractJsonArray(response: string): unknown[] | null {
  try {
    // Try direct parse first
    const trimmed = response.trim();
    const directParse = JSON.parse(trimmed);
    if (Array.isArray(directParse)) {
      return directParse;
    }
  } catch {
    // Fall through to extraction attempts
  }

  // Try to extract from markdown code block
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

  // Try to find JSON array in response
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
 * Validates that parsed items conform to the QuizQuestion shape.
 */
function validateQuizQuestions(items: unknown[]): QuizQuestion[] {
  const valid: QuizQuestion[] = [];

  for (const item of items) {
    if (
      item &&
      typeof item === 'object' &&
      'question' in item &&
      'options' in item &&
      'correctIndex' in item &&
      'explanation' in item
    ) {
      const q = item as Record<string, unknown>;
      if (
        typeof q.question === 'string' &&
        Array.isArray(q.options) &&
        q.options.every((o: unknown) => typeof o === 'string') &&
        typeof q.correctIndex === 'number' &&
        q.correctIndex >= 0 &&
        q.correctIndex < (q.options as string[]).length &&
        typeof q.explanation === 'string'
      ) {
        valid.push({
          question: q.question,
          options: q.options as string[],
          correctIndex: q.correctIndex,
          explanation: q.explanation,
        });
      }
    }
  }

  return valid;
}
