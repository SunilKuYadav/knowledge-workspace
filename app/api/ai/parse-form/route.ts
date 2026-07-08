/**
 * API route for AI-powered form data parsing.
 *
 * POST handler accepts { text, formType } and uses AI to extract
 * structured form data from a natural language description.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAIClient } from "@/ai";
import {
  buildTopicParsePrompt,
  buildProblemParsePrompt,
} from "@/src/ai/prompts";

const DEFAULT_BASE_URL =
  process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL = process.env.OPENAI_MODEL || "gpt-3.5-turbo";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, formType } = body as {
      text: string;
      formType: "topic" | "problem";
    };

    if (!text || !formType) {
      return NextResponse.json(
        { error: "Missing required fields: text, formType" },
        { status: 400 },
      );
    }

    const client = createAIClient({
      baseUrl: DEFAULT_BASE_URL,
      apiKey: API_KEY,
      defaultModel: MODEL,
    });

    const isAvailable = await client.isAvailable();
    if (!isAvailable) {
      return NextResponse.json(
        {
          error:
            "AI service is not available. Please check your AI service configuration.",
        },
        { status: 503 },
      );
    }

    const prompt =
      formType === "topic"
        ? buildTopicParsePrompt(text)
        : buildProblemParsePrompt(text);

    // Collect all tokens from the generator
    let result = "";
    for await (const token of client.generate(prompt)) {
      result += token;
    }

    // Try to parse the JSON response
    const trimmed = result.trim();
    // Strip markdown code fences if present
    const jsonStr = trimmed
      .replace(/^```(?:json)?\s*/, "")
      .replace(/\s*```$/, "");

    try {
      const parsed = JSON.parse(jsonStr);
      return NextResponse.json({ data: parsed });
    } catch {
      return NextResponse.json(
        {
          error:
            "AI returned invalid response. Please try again with a clearer description.",
        },
        { status: 422 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
