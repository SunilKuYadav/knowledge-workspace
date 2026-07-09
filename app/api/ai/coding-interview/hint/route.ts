/**
 * API route for generating progressive coding interview hints.
 *
 * POST handler accepts { problemStatement, code, level, previousHints }
 * and returns level-appropriate hint content.
 *
 * Hint Levels:
 * 1: Clarifying question/restatement (no algorithms)
 * 2: Name the algorithmic approach (no implementation details)
 * 3: Specific data structure + why it's appropriate
 * 4: High-level pseudocode (5-15 lines, no language-specific syntax)
 *
 * Requirements: 8.2-8.5
 */

import { NextRequest, NextResponse } from "next/server";
import { createAIClient, getModelForRoute } from "@/ai";
import { AI_TIMEOUT } from "@/app/coding-interview/lib/constants";
import { buildCodingInterviewHintPrompt } from "@/ai/prompts";

const DEFAULT_BASE_URL =
  process.env.OPENAI_BASE_URL || "http://127.0.0.1:1234/v1";
const API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL = getModelForRoute("ai/coding-interview/hint");

interface HintRequest {
  problemStatement: string;
  code: string;
  level: number;
  previousHints?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as HintRequest;

    // Validate required fields
    if (!body.problemStatement) {
      return NextResponse.json(
        { error: "Missing required field: problemStatement" },
        { status: 400 },
      );
    }

    if (typeof body.level !== "number" || body.level < 1 || body.level > 4) {
      return NextResponse.json(
        { error: "level must be an integer between 1 and 4" },
        { status: 400 },
      );
    }

    if (body.previousHints && !Array.isArray(body.previousHints)) {
      return NextResponse.json(
        { error: "previousHints must be an array of strings" },
        { status: 400 },
      );
    }

    const client = createAIClient({
      baseUrl: DEFAULT_BASE_URL,
      apiKey: API_KEY,
      defaultModel: MODEL,
    });
    const prompt = buildCodingInterviewHintPrompt(body);

    // Use AbortController for 30s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT);

    let fullResponse = "";

    try {
      const generator = client.generate(prompt);

      for await (const chunk of generator) {
        if (controller.signal.aborted) {
          break;
        }
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
          { error: "Hint generation timed out after 30 seconds" },
          { status: 504 },
        );
      }
      throw err;
    }

    if (controller.signal.aborted) {
      return NextResponse.json(
        { error: "Hint generation timed out after 30 seconds" },
        { status: 504 },
      );
    }

    const hint = fullResponse.trim();

    if (!hint) {
      return NextResponse.json(
        { error: "AI returned an empty hint response" },
        { status: 502 },
      );
    }

    return NextResponse.json({ hint, level: body.level });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
