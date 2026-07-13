/**
 * API route for generating assessment questions for a specific phase.
 *
 * POST handler accepts topic context, phase type, difficulty, and experience level,
 * then returns 2-3 validated questions matching the phase schema.
 *
 * Requirements: 4.1-4.6
 */

import { NextRequest, NextResponse } from "next/server";
import { getReadyClient } from "@/ai";
import type { AIClient } from "@/ai";
import { z } from "zod";
import { truncateContent, validateAIResponse } from "@/app/self-test/lib/validation";
import {
  AssessmentPhaseTypeSchema,
  DifficultyLevelSchema,
  ConceptualQuestionSchema,
  MCQQuestionSchema,
  AppliedQuestionSchema,
  CodeChallengeQuestionSchema,
} from "@/app/self-test/lib/types";
import type { AssessmentPhaseType } from "@/app/self-test/lib/types";
import { buildQuestionGenerationPrompt } from "@/src/ai/prompts/builders";

const RequestBodySchema = z.object({
  topicTitle: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
  phaseType: AssessmentPhaseTypeSchema,
  difficulty: DifficultyLevelSchema,
  experienceLevel: z.union([z.literal(5), z.literal(10), z.literal(15)]),
  content: z.string().optional(),
  previousPhaseScores: z.record(z.string(), z.number()).optional(),
  incorrectQuestions: z.array(z.string()).optional(),
});

function getSchemaForPhase(phaseType: AssessmentPhaseType): z.ZodSchema {
  switch (phaseType) {
    case "conceptual":
      return z.array(ConceptualQuestionSchema).min(2).max(3);
    case "mcq":
      return z.array(MCQQuestionSchema).min(2).max(3);
    case "applied":
      return z.array(AppliedQuestionSchema).min(2).max(3);
    case "code-challenge":
      return z.array(CodeChallengeQuestionSchema).min(2).max(3);
  }
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

    const {
      topicTitle,
      category,
      tags,
      phaseType,
      difficulty,
      experienceLevel,
      content,
      previousPhaseScores,
      incorrectQuestions,
    } = parsed.data;

    const truncatedContent = content ? truncateContent(content) : undefined;

    const client = await getReadyClient("ai/assessment/generate");

    const available = await client.isAvailable();
    if (!available) {
      return NextResponse.json(
        { error: "AI service is currently unavailable" },
        { status: 503 },
      );
    }

    const prompt = buildQuestionGenerationPrompt({
      topicTitle,
      category,
      tags,
      phaseType,
      difficulty,
      experienceLevel,
      content: truncatedContent,
      previousPhaseScores,
      incorrectQuestions,
    });

    const schema = getSchemaForPhase(phaseType);

    // First attempt
    let result = await generateAndValidate(client, prompt, schema);

    // Retry once on failure
    if (!result.success) {
      result = await generateAndValidate(client, prompt, schema);
    }

    if (!result.success) {
      return NextResponse.json(
        { error: `Question generation failed: ${result.error}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ questions: result.data });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function generateAndValidate<T>(
  client: AIClient,
  prompt: string,
  schema: z.ZodSchema<T>,
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    let fullResponse = "";
    for await (const chunk of client.generate(prompt)) {
      fullResponse += chunk;
    }

    const jsonData = extractJson(fullResponse);
    if (jsonData === null) {
      return { success: false, error: "Failed to parse AI response as JSON" };
    }

    return validateAIResponse(schema, jsonData);
  } catch {
    return { success: false, error: "AI generation request failed" };
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

  // Try finding JSON array or object in response
  const firstBracket = trimmed.indexOf("[");
  const lastBracket = trimmed.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    try {
      return JSON.parse(trimmed.slice(firstBracket, lastBracket + 1));
    } catch {
      /* fall through */
    }
  }

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
