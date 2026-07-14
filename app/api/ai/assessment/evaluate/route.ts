/**
 * API route for evaluating a user's answer to an assessment question.
 *
 * POST handler accepts question, user answer, and topic context,
 * then returns a validated QuestionEvaluation with a 30-second timeout.
 *
 * Requirements: 6.1, 6.3
 */

import { NextRequest, NextResponse } from "next/server";
import { getReadyClient } from "@/ai";
import { z } from "zod";
import { truncateContent, validateAIResponse } from "@/app/self-test/lib/validation";
import {
  AssessmentPhaseTypeSchema,
  QuestionEvaluationSchema,
} from "@/app/self-test/lib/types";
import type { QuestionEvaluation } from "@/app/self-test/lib/types";
import { buildAssessmentEvaluationPrompt } from "@/src/ai/prompts/builders";

const EVALUATION_TIMEOUT = 30_000; // 30 seconds

const RequestBodySchema = z.object({
  question: z.string(),
  userAnswer: z.string(),
  topicTitle: z.string(),
  category: z.string(),
  phaseType: AssessmentPhaseTypeSchema,
  content: z.string().optional(),
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

    const { question, userAnswer, topicTitle, category, phaseType, content } = parsed.data;
    const truncatedContent = content ? truncateContent(content) : undefined;

    const client = await getReadyClient("ai/assessment/evaluate");

    const available = await client.isAvailable();
    if (!available) {
      return NextResponse.json(
        { error: "AI service is currently unavailable" },
        { status: 503 },
      );
    }

    const prompt = buildAssessmentEvaluationPrompt({
      question,
      userAnswer,
      topicTitle,
      category,
      phaseType,
      content: truncatedContent,
    });

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
