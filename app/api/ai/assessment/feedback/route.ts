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
import type { FeedbackReport, PhaseResult } from "@/app/self-test/lib/types";

const RequestBodySchema = z.object({
  topicTitle: z.string(),
  category: z.string(),
  phaseResults: z.array(PhaseResultSchema),
  experienceLevel: z.union([z.literal(5), z.literal(10), z.literal(15)]),
});

function buildFeedbackPrompt(
  topicTitle: string,
  category: string,
  phaseResults: PhaseResult[],
  experienceLevel: number,
): string {
  const phasesSummary = phaseResults
    .map(
      (pr) =>
        `- ${pr.phaseType}: score ${pr.phaseScore}/10, difficulty: ${pr.difficulty}, ${pr.questions.length} questions`,
    )
    .join("\n");

  const questionsDetail = phaseResults
    .map((pr) => {
      const qDetails = pr.questions
        .map((q, i) => {
          const eval_ = pr.evaluations[i];
          return `  Q: ${q.question}\n  User Answer: ${pr.userAnswers[i] || "(no answer)"}\n  Score: ${eval_?.score ?? "N/A"}/10`;
        })
        .join("\n");
      return `Phase: ${pr.phaseType}\n${qDetails}`;
    })
    .join("\n\n");

  return `You are an expert technical assessment evaluator generating a comprehensive feedback report.

Topic: ${topicTitle}
Category: ${category}
Experience Level: ${experienceLevel} years

Phase Results Summary:
${phasesSummary}

Detailed Questions & Answers:
${questionsDetail}

Generate a comprehensive feedback report. Return ONLY a valid JSON object with:
- "overallConfidence": a number from 1.0 to 5.0 representing overall mastery
- "phaseScores": an object with "conceptual", "mcq", "applied", "code-challenge" keys, each a number 0-10
- "strengths": an array of 1-5 strings describing specific strengths demonstrated
- "weaknesses": an array of 1-5 strings describing specific areas needing improvement
- "studyRecommendations": an array of 2-5 objects, each with "recommendation" (string) and "targetSection" (string, one of: overview, notes, patterns, mistakes)
- "suggestedContentUpdates": an array of objects, each with "artifact" (string, the file to update), "gap" (string, what's missing), and "suggestion" (string, what to add)

Return ONLY valid JSON. Do not include any other text, markdown formatting, or code blocks.`;
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

    const { topicTitle, category, phaseResults, experienceLevel } = parsed.data;

    const client = await getReadyClient("ai/assessment/feedback");

    const available = await client.isAvailable();
    if (!available) {
      return NextResponse.json(
        { error: "AI service is currently unavailable" },
        { status: 503 },
      );
    }

    const prompt = buildFeedbackPrompt(
      topicTitle,
      category,
      phaseResults,
      experienceLevel,
    );

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
