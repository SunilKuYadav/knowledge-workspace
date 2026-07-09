/**
 * API route for generating improved content from assessment feedback context.
 *
 * POST handler accepts current content, identified weaknesses, and gap description,
 * then returns updated content addressing the identified gaps.
 *
 * Requirements: 8.2
 */

import { NextRequest, NextResponse } from "next/server";
import { createAIClient } from "@/ai";
import { z } from "zod";
import { truncateContent } from "@/app/self-test/lib/validation";

const DEFAULT_BASE_URL =
  process.env.OPENAI_BASE_URL || "http://127.0.0.1:1234/v1";
const API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL = process.env.OPENAI_MODEL || "gpt-3.5-turbo";

const RequestBodySchema = z.object({
  topicTitle: z.string(),
  currentContent: z.string(),
  artifact: z.string(),
  weaknesses: z.array(z.string()),
  gap: z.string(),
});

function buildContentUpdatePrompt(
  topicTitle: string,
  currentContent: string,
  artifact: string,
  weaknesses: string[],
  gap: string,
): string {
  return `You are an expert technical content writer improving study material based on assessment feedback.

Topic: ${topicTitle}
Artifact: ${artifact}
Identified Gap: ${gap}

Weaknesses to Address:
${weaknesses.map((w) => `- ${w}`).join("\n")}

Current Content:
${currentContent}

Your task: Improve the content above to address the identified gap and weaknesses. Keep the existing structure and format but add, expand, or clarify sections that address the gaps. Maintain the same markdown formatting style.

Return ONLY a valid JSON object with:
- "updatedContent": the complete updated content as a string (in markdown format)

Return ONLY valid JSON. Do not include any other text, markdown formatting outside the JSON, or code blocks.`;
}

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

    const client = createAIClient({
      baseUrl: DEFAULT_BASE_URL,
      apiKey: API_KEY,
      defaultModel: MODEL,
    });

    const available = await client.isAvailable();
    if (!available) {
      return NextResponse.json(
        { error: "AI service is currently unavailable" },
        { status: 503 },
      );
    }

    const prompt = buildContentUpdatePrompt(
      topicTitle,
      truncatedContent,
      artifact,
      weaknesses,
      gap,
    );

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
