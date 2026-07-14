/**
 * POST /api/ai/problem/evaluate-solution
 *
 * Evaluates a user's solution code using AI.
 * Returns feedback, strengths, improvements, complexity analysis,
 * and an overall score (0-100). Calibrated to the user's experience level.
 */

import { NextRequest, NextResponse } from "next/server";
import { getReadyClient } from "@/ai";
import { loadPromptConfig } from "@/ai/prompts/loadConfig";
import { buildEvaluateSolutionPrompt } from "@/ai/prompts/builders/solution-evaluation";

interface TestResultInput {
  input: unknown;
  expectedOutput: unknown;
  actualOutput: unknown;
  passed: boolean;
}

interface RequestBody {
  code: string;
  problemId: string;
  title: string;
  description: string;
  difficulty: string;
  patterns: string[];
  constraints: string[];
  testResults: TestResultInput[];
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody;

    if (!body.code || !body.title || !body.description) {
      return NextResponse.json(
        { error: "Missing required fields: code, title, description" },
        { status: 400 },
      );
    }

    const client = await getReadyClient("ai/coding-interview/evaluate");
    const available = await client.isAvailable();
    if (!available) {
      return NextResponse.json(
        { error: "AI service is currently unavailable" },
        { status: 503 },
      );
    }

    const config = await loadPromptConfig();
    const prompt = buildEvaluateSolutionPrompt(body, config.experienceLevel, config.targetRole);

    let raw = "";
    for await (const chunk of client.generate(prompt)) {
      raw += chunk;
    }

    const evaluation = parseEvaluation(raw, body.testResults);
    return NextResponse.json({ evaluation });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function parseEvaluation(
  raw: string,
  testResults: TestResultInput[],
): Record<string, unknown> {
  const passed = testResults.filter((r) => r.passed).length;
  const total = testResults.length;
  const passRate = total > 0 ? passed / total : 0;

  const defaultEval = {
    overallScore: Math.round(passRate * 60),
    feedback: "Unable to generate detailed feedback. Check test results for correctness.",
    strengths: passed > 0 ? ["Solution passes some test cases."] : [],
    improvements: ["Review failing test cases and edge case handling."],
    complexity: { time: "Unknown", space: "Unknown" },
    edgeCases: [],
    alternativeApproaches: [],
  };

  // Extract JSON from response
  let jsonStr = raw.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) jsonStr = fenceMatch[1].trim();

  const firstBrace = jsonStr.indexOf("{");
  const lastBrace = jsonStr.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
  }

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      overallScore: clamp(Number(parsed.overallScore) || 0, 0, 100),
      feedback: String(parsed.feedback || defaultEval.feedback),
      strengths: toStringArray(parsed.strengths, defaultEval.strengths),
      improvements: toStringArray(parsed.improvements, defaultEval.improvements),
      complexity: {
        time: String(parsed.complexity?.time || "Unknown"),
        space: String(parsed.complexity?.space || "Unknown"),
      },
      edgeCases: toStringArray(parsed.edgeCases, []),
      alternativeApproaches: toStringArray(parsed.alternativeApproaches, []),
    };
  } catch {
    return defaultEval;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function toStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value) || value.length === 0) return fallback;
  return value.map(String);
}
