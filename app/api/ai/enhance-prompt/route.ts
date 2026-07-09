/**
 * API route for enhancing/refining user prompts before form parsing.
 *
 * POST handler accepts { text, formType } and returns an enhanced version
 * of the user's prompt that will produce better structured data extraction.
 */

import { NextRequest, NextResponse } from "next/server";
import { getReadyClient } from "@/ai";
import {
  buildEnhancePromptForTopic,
  buildEnhancePromptForProblem,
  buildEnhancePromptForText,
} from "@/src/ai/prompts";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, formType, context } = body as {
      text: string;
      formType: "topic" | "problem" | "text";
      context?: string;
    };

    if (!text || !formType) {
      return NextResponse.json(
        { error: "Missing required fields: text, formType" },
        { status: 400 },
      );
    }

    const client = await getReadyClient("ai/enhance-prompt");

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
        : formType === "problem"
          ? buildEnhancePromptForProblem(text)
          : buildEnhancePromptForText(text, context);

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
