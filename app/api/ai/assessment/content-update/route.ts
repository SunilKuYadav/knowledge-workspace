/**
 * API route for generating improved content from assessment feedback context.
 *
 * POST handler accepts current content, identified weaknesses, and gap description,
 * then returns updated content addressing the identified gaps.
 *
 * Requirements: 8.2
 */

import { NextRequest, NextResponse } from "next/server";
import { getReadyClient } from "@/ai";
import { z } from "zod";
import { truncateContent } from "@/app/self-test/lib/validation";
import { buildAssessmentContentUpdatePrompt } from "@/src/ai/prompts/builders";

const RequestBodySchema = z.object({
  topicTitle: z.string(),
  currentContent: z.string(),
  artifact: z.string(),
  weaknesses: z.array(z.string()),
  gap: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = RequestBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: `Invalid request body: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}` },
        { status: 400 },
      );
    }

    const { topicTitle, currentContent, artifact, weaknesses, gap } = parsed.data;
    const truncatedContent = truncateContent(currentContent);

    const client = await getReadyClient("ai/assessment/content-update");

    const available = await client.isAvailable();
    if (!available) {
      return NextResponse.json(
        { error: "AI service is currently unavailable" },
        { status: 503 },
      );
    }

    const prompt = buildAssessmentContentUpdatePrompt({
      topicTitle,
      currentContent: truncatedContent,
      artifact,
      weaknesses,
      gap,
    });

    let fullResponse = "";
    for await (const chunk of client.generate(prompt)) {
      fullResponse += chunk;
    }

    const jsonData = extractJson(fullResponse);
    if (jsonData === null) {
      return NextResponse.json(
        { error: "Failed to parse AI content update response" },
        { status: 500 },
      );
    }

    const UpdateResponseSchema = z.object({
      updatedContent: z.string(),
    });

    const result = UpdateResponseSchema.safeParse(jsonData);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid content update response format" },
        { status: 500 },
      );
    }

    return NextResponse.json({ updatedContent: result.data.updatedContent });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function extractJson(response: string): unknown {
  const trimmed = response.trim();

  // Try direct parse
  try {
    return JSON.parse(trimmed);
  } catch {
    /* fall through */
  }

  // Try code block extraction
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      /* fall through */
    }
  }

  // Try finding JSON object in response
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    } catch {
      /* fall through */
    }
  }

  return null;
}
