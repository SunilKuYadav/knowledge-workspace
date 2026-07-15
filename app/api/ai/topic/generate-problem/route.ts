/**
 * POST /api/ai/topic/generate-problem
 *
 * Given a suggested problem's metadata, generates a full problem description
 * with test cases, constraints, boilerplate, and examples — ready for practice.
 *
 * Body: {
 *   title: string,
 *   difficulty: string,
 *   description: string,
 *   patterns: string[],
 *   topicTitle: string,
 *   topicCategory: string,
 *   artifactContent: string,
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { getReadyClient } from "@/ai";
import { loadPromptConfig } from "@/src/ai/prompts/loadConfig";
import { buildGenerateProblemFromTopicPrompt } from "@/ai/prompts/builders/topic-problems";

interface RequestBody {
  title: string;
  difficulty: string;
  description: string;
  patterns: string[];
  topicTitle: string;
  topicCategory: string;
  artifactContent: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody;

    if (!body.title || !body.description) {
      return NextResponse.json(
        { error: "Missing required fields: title, description" },
        { status: 400 },
      );
    }

    const client = await getReadyClient("ai/topic/generate-problem");
    const available = await client.isAvailable();
    if (!available) {
      return NextResponse.json(
        { error: "AI service is currently unavailable" },
        { status: 503 },
      );
    }

    const config = await loadPromptConfig();
    const prompt = buildGenerateProblemFromTopicPrompt(body, config.experienceLevel);

    let raw = "";
    for await (const chunk of client.generate(prompt)) {
      raw += chunk;
    }

    const problem = parseProblemResponse(raw, body);
    return NextResponse.json({ problem });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function parseProblemResponse(raw: string, body: RequestBody): Record<string, unknown> {
  const defaults = {
    title: body.title,
    difficulty: body.difficulty,
    description: body.description,
    constraints: [],
    examples: [],
    testCases: [],
    boilerplate: `function solution(): void {\n  // Your solution here\n}`,
    timeComplexity: "Unknown",
    spaceComplexity: "Unknown",
    patterns: body.patterns,
  };

  try {
    let jsonStr = raw.trim();
    const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();

    const firstBrace = jsonStr.indexOf("{");
    const lastBrace = jsonStr.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;

    return {
      title: String(parsed.title || defaults.title),
      difficulty: validateDifficulty(parsed.difficulty) || defaults.difficulty,
      description: String(parsed.description || defaults.description),
      constraints: Array.isArray(parsed.constraints) ? parsed.constraints.map(String) : defaults.constraints,
      examples: Array.isArray(parsed.examples)
        ? parsed.examples.map((ex: Record<string, unknown>) => ({
            input: String(ex.input || ""),
            expectedOutput: String(ex.expectedOutput || ex.expected_output || ""),
            explanation: ex.explanation ? String(ex.explanation) : undefined,
          }))
        : defaults.examples,
      testCases: Array.isArray(parsed.testCases || parsed.test_cases)
        ? (parsed.testCases as Array<Record<string, unknown>> || parsed.test_cases as Array<Record<string, unknown>>).map((tc) => ({
            input: String(tc.input || ""),
            expectedOutput: String(tc.expectedOutput || tc.expected_output || ""),
          }))
        : defaults.testCases,
      boilerplate: String(parsed.boilerplate || defaults.boilerplate),
      timeComplexity: String(parsed.timeComplexity || parsed.time_complexity || defaults.timeComplexity),
      spaceComplexity: String(parsed.spaceComplexity || parsed.space_complexity || defaults.spaceComplexity),
      patterns: Array.isArray(parsed.patterns) ? parsed.patterns.map(String) : defaults.patterns,
      harness: parsed.harness ? String(parsed.harness) : undefined,
    };
  } catch {
    return defaults;
  }
}

function validateDifficulty(d: unknown): "easy" | "medium" | "hard" | null {
  if (d === "easy" || d === "medium" || d === "hard") return d;
  return null;
}
