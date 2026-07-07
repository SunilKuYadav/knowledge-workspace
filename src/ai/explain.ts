/**
 * AI-powered explanation, similar problem suggestion, and interview prep.
 *
 * Provides:
 * - `explainConcept()`: streaming explanation of a concept
 * - `suggestSimilarProblems()`: list of related problems based on metadata
 * - `generateInterviewPrep()`: streaming interview preparation guidance
 *
 * Requirements: 5.4, 5.5
 */

import type { Problem } from "@/types";
import type { AIClient } from "./client";
import {
  buildExplainPrompt,
  buildSimilarProblemsPrompt,
  buildInterviewPrepPrompt,
} from "./prompts";

/**
 * Streams an explanation of a concept given surrounding context.
 *
 * @param concept - The concept to explain
 * @param context - Additional context around the concept
 * @param client - The AIClient instance to use
 * @yields String chunks of the explanation
 */
export async function* explainConcept(
  concept: string,
  context: string,
  client: AIClient,
): AsyncGenerator<string> {
  const available = await client.isAvailable();
  if (!available) {
    yield "AI is currently unavailable. Please check your AI service configuration.";
    return;
  }

  const prompt = buildExplainPrompt(concept, context);

  try {
    for await (const chunk of client.generate(prompt)) {
      yield chunk;
    }
  } catch {
    yield "\n\n[Error: Explanation generation failed. Please try again.]";
  }
}

/**
 * Suggests similar problems based on the given problem's metadata.
 *
 * @param problem - The Problem to find similar items for
 * @param client - The AIClient instance to use
 * @returns Array of problem name suggestions, or empty array on failure
 */
export async function suggestSimilarProblems(
  problem: Problem,
  client: AIClient,
): Promise<string[]> {
  try {
    const available = await client.isAvailable();
    if (!available) {
      return [];
    }

    const prompt = buildSimilarProblemsPrompt(
      problem.title,
      problem.platform,
      problem.difficulty,
      problem.patterns.join(", "),
      problem.companies.join(", "),
    );

    let fullResponse = "";
    for await (const chunk of client.generate(prompt)) {
      fullResponse += chunk;
    }

    return parseSuggestions(fullResponse);
  } catch {
    return [];
  }
}

/**
 * Streams interview preparation content for the given problem.
 *
 * @param problem - The Problem to prepare for
 * @param client - The AIClient instance to use
 * @yields String chunks of the interview prep content
 */
export async function* generateInterviewPrep(
  problem: Problem,
  client: AIClient,
): AsyncGenerator<string> {
  const available = await client.isAvailable();
  if (!available) {
    yield "AI is currently unavailable. Please check your AI service configuration.";
    return;
  }

  const prompt = buildInterviewPrepPrompt(
    problem.title,
    problem.platform,
    problem.difficulty,
    problem.patterns.join(", "),
  );

  try {
    for await (const chunk of client.generate(prompt)) {
      yield chunk;
    }
  } catch {
    yield "\n\n[Error: Interview prep generation failed. Please try again.]";
  }
}

/**
 * Parses a response string into an array of suggestion strings.
 */
function parseSuggestions(response: string): string[] {
  try {
    const trimmed = response.trim();
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
  } catch {
    // Fall through
  }

  // Try extracting from code block
  const codeBlockMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1].trim());
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item): item is string => typeof item === "string",
        );
      }
    } catch {
      // Fall through
    }
  }

  // Try to find JSON array
  const arrayMatch = response.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item): item is string => typeof item === "string",
        );
      }
    } catch {
      // Give up
    }
  }

  return [];
}
