/**
 * API route for enhancing/refining user prompts before form parsing.
 *
 * POST handler accepts { text, formType } and returns an enhanced version
 * of the user's prompt that will produce better structured data extraction.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAIClient } from "@/ai";
import {
  buildEnhancePromptForTopic,
  buildEnhancePromptForProblem,
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
        ? buildEnhancePromptForTopic(text)
        : buildEnhancePromptForProblem(text);

    let result = "";
    for await (const token of client.generate(prompt)) {
      result += token;
    }

    // Clean up the result — remove any surrounding quotes or whitespace
    let enhanced = result.trim();
    if (
      (enhanced.startsWith('"') && enhanced.endsWith('"')) ||
      (enhanced.startsWith("'") && enhanced.endsWith("'"))
    ) {
      enhanced = enhanced.slice(1, -1);
    }

    return NextResponse.json({ enhanced });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
