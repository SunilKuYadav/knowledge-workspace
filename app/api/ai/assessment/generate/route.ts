/**
 * API route for generating assessment questions for a specific phase.
 *
 * POST handler accepts topic context, phase type, difficulty, and experience level,
 * then returns 2-3 validated questions matching the phase schema.
 *
 * Requirements: 4.1-4.6
 */

import { NextRequest, NextResponse } from "next/server";
import { createAIClient, getModelForRoute } from "@/ai";
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
import type { AssessmentPhaseType, DifficultyLevel } from "@/app/self-test/lib/types";

const DEFAULT_BASE_URL =
  process.env.OPENAI_BASE_URL || "http://127.0.0.1:1234/v1";
const API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL = getModelForRoute("ai/assessment/generate");

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

function getSchemaForPhase(phaseType: AssessmentPhaseType) {
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

function buildGeneratePrompt(
  topicTitle: string,
  category: string,
  tags: string[],
  phaseType: AssessmentPhaseType,
  difficulty: DifficultyLevel,
  experienceLevel: number,
  content?: string,
  previousPhaseScores?: Record<string, number>,
  incorrectQuestions?: string[],
): string {
  const phaseInstructions: Record<AssessmentPhaseType, string> = {
    conceptual: `Generate 2-3 conceptual questions that test understanding of core concepts.
Each question must be a JSON object with:
- "type": "conceptual"
- "question": a clear open-ended question string
- "expectedAnswer": a comprehensive expected answer string`,
    mcq: `Generate 2-3 multiple choice questions.
Each question must be a JSON object with:
- "type": "mcq"
- "question": a clear question string
- "options": an array of exactly 4 string options
- "correctIndex": an integer 0-3 indicating the correct option
- "explanation": a string explaining why the correct answer is right
- "distractorExplanations": an array of exactly 3 strings explaining why each wrong option is incorrect`,
    applied: `Generate 2-3 applied scenario-based questions.
Each question must be a JSON object with:
- "type": "applied"
- "question": a clear question string
- "scenario": a real-world scenario description string
- "expectedAnswer": a comprehensive expected answer string`,
    "code-challenge": `Generate 2-3 coding challenge questions.
Each question must be a JSON object with:
- "type": "code-challenge"
- "question": a brief description string
- "problemStatement": a detailed problem statement string
- "inputFormat": a string describing expected input format
- "outputFormat": a string describing expected output format
- "examples": an array of 1-3 objects, each with "input", "expectedOutput", and "explanation" strings`,
  };

  let prompt = `You are an expert technical interviewer generating ${phaseType} assessment questions.

Topic: ${topicTitle}
Category: ${category}
Tags: ${tags.join(", ")}
Difficulty: ${difficulty}
Experience Level: ${experienceLevel} years

${phaseInstructions[phaseType]}

`;

  if (content) {
    prompt += `\nTopic Content (use this to make questions contextually relevant):\n${content}\n`;
  }

  if (previousPhaseScores && Object.keys(previousPhaseScores).length > 0) {
    prompt += `\nPrevious phase scores: ${JSON.stringify(previousPhaseScores)}\n`;
  }

  if (incorrectQuestions && incorrectQuestions.length > 0) {
    prompt += `\nPreviously incorrect questions (focus on these areas):\n${incorrectQuestions.join("\n")}\n`;
  }

  prompt += `\nReturn ONLY a valid JSON array of questions. Do not include any other text, markdown formatting, or code blocks.`;

  return prompt;
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

    const prompt = buildGeneratePrompt(
      topicTitle,
      category,
      tags,
      phaseType,
      difficulty,
      experienceLevel,
      truncatedContent,
      previousPhaseScores,
      incorrectQuestions,
    );

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
  client: ReturnType<typeof createAIClient>,
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
