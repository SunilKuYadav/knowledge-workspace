/**
 * API route for generating a feedback report at the end of an assessment session.
 *
 * POST handler accepts phase results and topic context,
 * then returns a validated FeedbackReport with strengths, weaknesses,
 * and study recommendations.
 *
 * Requirements: 7.1
 */

import { NextRequest, NextResponse } from "next/server";
import { getReadyClient } from "@/ai";
import { z } from "zod";
import { validateAIResponse } from "@/app/self-test/lib/validation";
import {
  PhaseResultSchema,
  FeedbackReportSchema,
} from "@/app/self-test/lib/types";
import type { FeedbackReport } from "@/app/self-test/lib/types";
import { buildFeedbackReportPrompt } from "@/src/ai/prompts/builders";

const RequestBodySchema = z.object({
  topicTitle: z.string(),
  category: z.string(),
  phaseResults: z.array(PhaseResultSchema),
  experienceLevel: z.union([z.literal(5), z.literal(10), z.literal(15)]),
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

    const { topicTitle, category, phaseResults, experienceLevel } = parsed.data;

    const client = await getReadyClient("ai/assessment/feedback");

    const available = await client.isAvailable();
    if (!available) {
      return NextResponse.json(
        { error: "AI service is currently unavailable" },
        { status: 503 },
      );
    }

    const prompt = buildFeedbackReportPrompt({
      topicTitle,
      category,
      phaseResults,
      experienceLevel,
    });

    let fullResponse = "";
    for await (const chunk of client.generate(prompt)) {
      fullResponse += chunk;
    }

    const jsonData = extractJson(fullResponse);
    if (jsonData === null) {
      return NextResponse.json(
        { error: "Failed to parse AI feedback response" },
        { status: 500 },
      );
    }

    const validation = validateAIResponse<FeedbackReport>(
      FeedbackReportSchema,
      jsonData,
    );

    if (!validation.success) {
      return NextResponse.json(
        { error: `Invalid feedback response: ${validation.error}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ report: validation.data });
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
