/**
 * API route for evaluating a user's answer to an assessment question.
 *
 * POST handler accepts question, user answer, and topic context,
 * then returns a validated QuestionEvaluation with a 30-second timeout.
 *
 * Requirements: 6.1, 6.3
 */

import { NextRequest, NextResponse } from "next/server";
import { createAIClient, getModelForRoute } from "@/ai";
import { z } from "zod";
import { truncateContent, validateAIResponse } from "@/app/self-test/lib/validation";
import {
  AssessmentPhaseTypeSchema,
  QuestionEvaluationSchema,
} from "@/app/self-test/lib/types";
import type { QuestionEvaluation } from "@/app/self-test/lib/types";

const DEFAULT_BASE_URL =
  process.env.OPENAI_BASE_URL || "http://127.0.0.1:1234/v1";
const API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL = getModelForRoute("ai/assessment/evaluate");

const EVALUATION_TIMEOUT = 30_000; // 30 seconds

const RequestBodySchema = z.object({
  question: z.string(),
  userAnswer: z.string(),
  topicTitle: z.string(),
  category: z.string(),
  phaseType: AssessmentPhaseTypeSchema,
  content: z.string().optional(),
});

function buildEvaluationPrompt(
  question: string,
  userAnswer: string,
  topicTitle: string,
  category: string,
  phaseType: string,
  content?: string,
): string {
  let prompt = `You are an expert technical evaluator assessing a student's answer.

Topic: ${topicTitle}
Category: ${category}
Phase Type: ${phaseType}

Question: ${question}

User's Answer: ${userAnswer}

`;

  if (content) {
    prompt += `Reference Content:\n${content}\n\n`;
  }

  prompt += `Evaluate the answer and return ONLY a valid JSON object with:
- "score": an integer from 0 to 10 (0 = completely wrong, 10 = perfect)
- "feedback": a string with constructive feedback (max 500 characters)
- "mistakes": an array of up to 5 strings describing specific mistakes (empty array if none)
- "keyInsights": an array of up to 3 strings with important insights the answer should contain
- "expectedAnswer": (optional) a string with the ideal answer if the user's answer was significantly wrong

Return ONLY valid JSON. Do not include any other text, markdown formatting, or code blocks.`;

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

    const { question, userAnswer, topicTitle, category, phaseType, content } = parsed.data;
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

    const prompt = buildEvaluationPrompt(
      question,
      userAnswer,
      topicTitle,
      category,
      phaseType,
      truncatedContent,
    );

    // 30-second timeout via AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), EVALUATION_TIMEOUT);

    try {
      let fullResponse = "";
      for await (const chunk of client.generate(prompt)) {
        if (controller.signal.aborted) break;
        fullResponse += chunk;
      }
      clearTimeout(timeoutId);

      if (controller.signal.aborted) {
        return NextResponse.json(
          { error: "Evaluation timed out after 30 seconds" },
          { status: 504 },
        );
      }

      const jsonData = extractJson(fullResponse);
      if (jsonData === null) {
        return NextResponse.json(
          { error: "Failed to parse AI evaluation response" },
          { status: 500 },
        );
      }

      const validation = validateAIResponse<QuestionEvaluation>(
        QuestionEvaluationSchema,
        jsonData,
      );

      if (!validation.success) {
        return NextResponse.json(
          { error: `Invalid evaluation response: ${validation.error}` },
          { status: 500 },
        );
      }

      return NextResponse.json({ evaluation: validation.data });
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof Error && err.name === "AbortError") {
        return NextResponse.json(
          { error: "Evaluation timed out after 30 seconds" },
          { status: 504 },
        );
      }

      return NextResponse.json(
        { error: "Evaluation failed. Please retry." },
        { status: 500 },
      );
    }
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
