/**
 * API route for generating AI coding interview problems.
 *
 * POST handler accepts { source, context, language, difficulty } and returns
 * a GeneratedProblem JSON object with full problem metadata.
 *
 * Requirements: 4.1-4.9
 */

import { NextRequest, NextResponse } from "next/server";
import { getReadyClient } from "@/ai";
import { AI_TIMEOUT } from "@/app/coding-interview/lib/constants";
import { buildProblemGenerationPrompt } from "@/ai/prompts";
import { loadPromptConfig } from "@/ai/prompts/loadConfig";
import { getPromptForAction } from "@/ai/prompts/config";
import type {
  InterviewSource,
  InterviewContext,
  GeneratedProblem,
} from "@/app/coding-interview/lib/types";

interface GenerateProblemRequest {
  source: InterviewSource;
  context?: InterviewContext;
  language?: "javascript" | "typescript";
  difficulty?: "easy" | "medium" | "hard";
  userPrompt?: string;
}

function validateGeneratedProblem(data: unknown): data is GeneratedProblem {
  if (!data || typeof data !== "object") return false;

  const problem = data as Record<string, unknown>;

  // Check required string fields
  const requiredStrings = [
    "title",
    "difficulty",
    "category",
    "statement",
    "inputFormat",
    "outputFormat",
    "expectedTimeComplexity",
    "expectedSpaceComplexity",
    "boilerplate",
  ];
  for (const field of requiredStrings) {
    if (
      typeof problem[field] !== "string" ||
      (problem[field] as string).length === 0
    ) {
      return false;
    }
  }

  // Validate difficulty
  if (!["easy", "medium", "hard"].includes(problem.difficulty as string)) {
    return false;
  }

  // Validate arrays with minimum counts
  if (!Array.isArray(problem.tags) || problem.tags.length < 2) return false;
  if (!Array.isArray(problem.samples) || problem.samples.length < 2)
    return false;
  if (!Array.isArray(problem.edgeCases) || problem.edgeCases.length < 2)
    return false;
  if (
    !Array.isArray(problem.hiddenTestCases) ||
    problem.hiddenTestCases.length < 5
  )
    return false;
  if (
    !Array.isArray(problem.companyTags) ||
    problem.companyTags.length < 1 ||
    problem.companyTags.length > 5
  )
    return false;
  if (!Array.isArray(problem.constraints)) return false;

  // Validate sample structure
  for (const sample of problem.samples as Array<Record<string, unknown>>) {
    if (
      typeof sample.input !== "string" ||
      typeof sample.output !== "string" ||
      typeof sample.explanation !== "string"
    ) {
      return false;
    }
  }

  // Validate edge case structure
  for (const edgeCase of problem.edgeCases as Array<Record<string, unknown>>) {
    if (
      typeof edgeCase.description !== "string" ||
      typeof edgeCase.input !== "string" ||
      typeof edgeCase.expectedOutput !== "string"
    ) {
      return false;
    }
  }

  // Validate hidden test case structure
  for (const testCase of problem.hiddenTestCases as Array<
    Record<string, unknown>
  >) {
    if (!("input" in testCase) || !("expectedOutput" in testCase)) {
      return false;
    }
  }

  return true;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateProblemRequest;

    // Validate required fields
    if (!body.source) {
      return NextResponse.json(
        { error: "Missing required field: source" },
        { status: 400 },
      );
    }

    const validSources: InterviewSource[] = [
      "problem",
      "topic",
      "self-test",
      "revision",
      "practice",
      "interview",
    ];
    if (!validSources.includes(body.source)) {
      return NextResponse.json(
        { error: `Invalid source: ${body.source}` },
        { status: 400 },
      );
    }

    if (
      body.difficulty &&
      !["easy", "medium", "hard"].includes(body.difficulty)
    ) {
      return NextResponse.json(
        { error: `Invalid difficulty: ${body.difficulty}` },
        { status: 400 },
      );
    }

    if (
      body.language &&
      !["javascript", "typescript"].includes(body.language)
    ) {
      return NextResponse.json(
        { error: `Invalid language: ${body.language}` },
        { status: 400 },
      );
    }

    const client = await getReadyClient("ai/coding-interview/generate-problem");
    const prompt = buildProblemGenerationPrompt(body);

    // Prepend experience-calibrated coding interview context
    const promptConfig = await loadPromptConfig();
    const codingInterviewContext = getPromptForAction("codingInterview", promptConfig);
    const fullPrompt = codingInterviewContext + "\n\n" + prompt;

    // Use AbortController for 30s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT);

    let fullResponse = "";

    try {
      const generator = client.generate(fullPrompt);

      for await (const chunk of generator) {
        if (controller.signal.aborted) {
          break;
        }
        fullResponse += chunk;
      }

      clearTimeout(timeoutId);
    } catch (err) {
      clearTimeout(timeoutId);
      if (
        controller.signal.aborted ||
        (err instanceof Error && err.name === "AbortError")
      ) {
        return NextResponse.json(
          { error: "Problem generation timed out after 30 seconds" },
          { status: 504 },
        );
      }
      throw err;
    }

    if (controller.signal.aborted) {
      return NextResponse.json(
        { error: "Problem generation timed out after 30 seconds" },
        { status: 504 },
      );
    }

    // If the AI returned nothing, the model likely isn't loaded or errored
    if (!fullResponse.trim()) {
      console.error("[generate-problem] AI returned empty response. Model may not be loaded or LM Studio returned an error.");
      return NextResponse.json(
        { error: "AI returned an empty response. Check that the model is loaded in LM Studio." },
        { status: 502 },
      );
    }

    // Parse JSON from response — handle markdown code blocks
    let jsonStr = fullResponse.trim();
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith("```")) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response as valid JSON" },
        { status: 502 },
      );
    }

    // Validate the parsed response matches GeneratedProblem structure
    if (!validateGeneratedProblem(parsed)) {
      return NextResponse.json(
        { error: "AI response does not match required problem structure" },
        { status: 502 },
      );
    }

    return NextResponse.json(parsed as GeneratedProblem);
  } catch (err) {
    console.error("[generate-problem] Unhandled error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { error: `Internal server error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }
}
