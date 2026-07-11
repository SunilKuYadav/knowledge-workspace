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
    const prompt = buildGenerateProblemPrompt(body, config.experienceLevel);

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

function buildGenerateProblemPrompt(body: RequestBody, experienceLevel: number): string {
  const levelHint = experienceLevel === 1
    ? "Design the problem for a junior engineer. Include clear input/output formats, simple constraints, and a straightforward boilerplate. Examples should be easy to follow."
    : experienceLevel === 5
      ? "Design for a senior engineer. Include non-trivial edge cases, meaningful constraints, and expect optimal solutions."
      : experienceLevel >= 10
        ? "Design for a staff+ engineer. Include challenging edge cases, tight constraints that require optimal approaches, and test cases that catch subtle bugs."
        : "Design for an experienced engineer.";

  const topicContent = body.artifactContent.slice(0, 3000);

  return `You are an expert at creating LeetCode-style coding problems. Generate a complete, well-structured coding problem based on this specification.

Problem: ${body.title}
Difficulty: ${body.difficulty}
Brief: ${body.description}
Patterns: ${body.patterns.join(", ")}
Topic Context: ${body.topicTitle} (${body.topicCategory})

${levelHint}

Related topic content for context:
${topicContent}

Return ONLY a valid JSON object with this exact structure:
{
  "title": "${body.title}",
  "difficulty": "${body.difficulty}",
  "description": "Full problem statement in markdown. Include the problem narrative, input/output description, and any special conditions.",
  "constraints": ["constraint 1", "constraint 2", ...],
  "examples": [
    { "input": "formatted input string", "expectedOutput": "expected output", "explanation": "step-by-step explanation" }
  ],
  "testCases": [
    { "input": "test input", "expectedOutput": "expected output" }
  ],
  "boilerplate": "function solutionName(params: types): returnType {\\n  // Your solution here\\n}",
  "timeComplexity": "O(...)",
  "spaceComplexity": "O(...)",
  "patterns": ${JSON.stringify(body.patterns)}
}

Requirements:
- Provide 2-3 examples with clear explanations
- Provide 5-8 test cases covering edge cases, typical cases, and boundary conditions
- The boilerplate should be TypeScript with proper types
- Input/output formats should be parseable (use JSON-like format for arrays/objects)
- Constraints should be specific (e.g., "1 <= nums.length <= 10^5")
- Description should be clear, complete, and unambiguous

Respond with ONLY the JSON.`;
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
    };
  } catch {
    return defaults;
  }
}

function validateDifficulty(d: unknown): "easy" | "medium" | "hard" | null {
  if (d === "easy" || d === "medium" || d === "hard") return d;
  return null;
}
