/**
 * POST /api/ai/coding-interview/validate-test-cases
 *
 * Validates and fixes hidden test cases for a coding interview problem.
 * Ensures inputs are proper JSON arrays of function arguments and
 * expected outputs are correct.
 *
 * Body: { problem: GeneratedProblem }
 * Returns: { hiddenTestCases, corrections, isValid }
 */

import { NextRequest, NextResponse } from "next/server";
import { getReadyClient } from "@/ai";
import { AI_TIMEOUT } from "@/app/coding-interview/lib/constants";
import { logger } from "@/src/lib/logger";
import { buildCodingInterviewTestValidationPrompt } from "@/ai/prompts/builders/test-validation";
import type { GeneratedProblem } from "@/app/coding-interview/lib/types";

interface Correction {
  index: number;
  original: { input: unknown; expectedOutput: unknown };
  corrected: { input: unknown; expectedOutput: unknown };
  reason: string;
}

interface ValidationResponse {
  hiddenTestCases: Array<{ input: unknown; expectedOutput: unknown }>;
  corrections: Correction[];
}

/**
 * Robustly extract a JSON object from an LLM response that may contain:
 * - <think>...</think> blocks (qwen3, deepseek)
 * - ```json ... ``` code fences
 * - Leading/trailing prose
 * - Multiple code blocks (picks the first valid JSON one)
 */
function extractJSON<T>(raw: string): T {
  let text = raw;

  // Strip <think>...</think> blocks (greedy, handles multiline)
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, "");

  // Try to find JSON inside a code fence first
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) {
    const candidate = fenceMatch[1].trim();
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // Fall through to other strategies
    }
  }

  // Try to find the first { ... } block that parses as valid JSON
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = text.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // Fall through
    }
  }

  // Last resort: try parsing the whole trimmed text
  return JSON.parse(text.trim()) as T;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { problem: GeneratedProblem };

    if (!body.problem) {
      return NextResponse.json(
        { error: "Missing required field: problem" },
        { status: 400 },
      );
    }

    const client = await getReadyClient(
      "ai/coding-interview/validate-test-cases",
    );
    const prompt = buildCodingInterviewTestValidationPrompt(body.problem);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT);

    let fullResponse = "";

    try {
      const generator = client.generate(prompt);
      for await (const chunk of generator) {
        if (controller.signal.aborted) break;
        fullResponse += chunk;
      }
      clearTimeout(timeoutId);
    } catch (err) {
      clearTimeout(timeoutId);
      if (
        controller.signal.aborted ||
        (err instanceof Error && err.name === "AbortError")
      ) {
        return NextResponse.json(
          { error: "Validation timed out" },
          { status: 504 },
        );
      }
      throw err;
    }

    // Guard: AI returned nothing (model offline, upstream error, empty stream)
    if (!fullResponse.trim()) {
      logger.error(
        "api/coding-interview/validate-test-cases",
        "AI returned an empty response — model may be unavailable or overloaded",
      );
      return NextResponse.json(
        {
          error:
            "AI model returned an empty response. The model may be unavailable or overloaded — please try again.",
        },
        { status: 502 },
      );
    }

    // Parse JSON from response — handle thinking blocks, code fences, extra text
    let parsed: ValidationResponse;
    try {
      parsed = extractJSON<ValidationResponse>(fullResponse);
    } catch (parseErr) {
      logger.error(
        "api/coding-interview/validate-test-cases",
        "Failed to parse AI response",
        {
          error: parseErr instanceof Error ? parseErr.message : String(parseErr),
          rawResponse: fullResponse.slice(0, 2000),
        },
      );
      return NextResponse.json(
        {
          error: "Failed to parse AI validation response",
          detail: parseErr instanceof Error ? parseErr.message : String(parseErr),
          rawSnippet: fullResponse.slice(0, 500),
        },
        { status: 502 },
      );
    }

    // Basic structure validation
    if (!Array.isArray(parsed.hiddenTestCases)) {
      return NextResponse.json(
        { error: "AI response missing hiddenTestCases array" },
        { status: 502 },
      );
    }

    const isValid = !parsed.corrections || parsed.corrections.length === 0;

    return NextResponse.json({
      hiddenTestCases: parsed.hiddenTestCases,
      corrections: parsed.corrections || [],
      isValid,
    });
  } catch (err) {
    logger.error(
      "api/coding-interview/validate-test-cases",
      `Unhandled error: ${err instanceof Error ? err.message : String(err)}`,
      err instanceof Error ? err.stack : undefined,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
