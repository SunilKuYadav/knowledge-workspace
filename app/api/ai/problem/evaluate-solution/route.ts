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

function buildEvaluateSolutionPrompt(body: RequestBody, experienceLevel: number, targetRole: string): string {
  const passed = body.testResults.filter((r) => r.passed).length;
  const total = body.testResults.length;

  const failedCases = body.testResults
    .filter((r) => !r.passed)
    .slice(0, 5)
    .map(
      (r) =>
        `  Input: ${JSON.stringify(r.input)} → Expected: ${JSON.stringify(r.expectedOutput)}, Got: ${JSON.stringify(r.actualOutput)}`,
    )
    .join("\n");

  const levelContext = experienceLevel === 1
    ? `Evaluate as if reviewing a junior engineer (1 YOE, targeting L3/L4). Be encouraging, focus on correctness and basic best practices. A working brute-force solution is a strong positive.`
    : experienceLevel === 5
      ? `Evaluate as if reviewing a senior engineer (5 YOE, targeting ${targetRole || "L4/L5"}). Expect clean code, proper edge case handling, and reasonable complexity awareness.`
      : experienceLevel === 10
        ? `Evaluate as if reviewing a staff engineer (10 YOE, targeting ${targetRole || "L5/L6"}). Expect optimal solutions, production-quality code, formal complexity analysis, and awareness of system-level implications.`
        : `Evaluate as if reviewing a principal engineer (15 YOE, targeting ${targetRole || "L6/L7"}). Expect elegant solutions, deep algorithmic insight, and code that demonstrates architectural thinking.`;

  const scoringGuide = experienceLevel === 1
    ? `Scoring guide (calibrated for junior engineers):
- 90-100: Correct solution, handles basic edge cases, clean and readable
- 70-89: Correct solution, minor style issues or missed edge cases
- 50-69: Partially correct, shows understanding but has bugs
- 30-49: Shows effort but fundamental issues in approach
- 0-29: Does not demonstrate understanding of the problem`
    : experienceLevel === 5
      ? `Scoring guide (calibrated for senior engineers):
- 90-100: Optimal solution, clean code, good edge case coverage
- 70-89: Correct and efficient, minor improvements possible
- 50-69: Works but suboptimal complexity or missing important edge cases
- 30-49: Partially correct, needs significant improvement
- 0-29: Fundamentally flawed approach`
      : `Scoring guide (calibrated for staff+ engineers):
- 90-100: Optimal solution, elegant code, comprehensive edge cases, production-ready
- 70-89: Correct optimal solution, good quality, minor polish possible
- 50-69: Works but not optimal, or missing production considerations
- 30-49: Suboptimal approach or significant quality issues
- 0-29: Would not pass a ${experienceLevel >= 10 ? "Staff" : "Senior"}-level interview bar`;

  return `You are a senior software engineer conducting a code review for an interview preparation tool.

${levelContext}

Problem: ${body.title}
Difficulty: ${body.difficulty}
Patterns: ${body.patterns.join(", ")}
Constraints: ${body.constraints.join("; ")}

Problem Description:
${body.description.slice(0, 2000)}

Submitted Code:
\`\`\`typescript
${body.code}
\`\`\`

Test Results: ${passed}/${total} passed
${failedCases ? `\nFailed Cases:\n${failedCases}` : ""}

Return ONLY a valid JSON object with this exact structure:
{
  "overallScore": <number 0-100>,
  "feedback": "<1-3 sentence overall assessment calibrated to ${experienceLevel} YOE level>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "improvements": ["<specific improvement 1>", "<specific improvement 2>", ...],
  "complexity": {
    "time": "<Big-O time complexity of the submitted solution>",
    "space": "<Big-O space complexity of the submitted solution>"
  },
  "edgeCases": ["<edge case the solution handles or misses>", ...],
  "alternativeApproaches": ["<brief description of an alternative approach>", ...]
}

${scoringGuide}

Be specific and actionable in improvements. Reference the actual code when possible.
Respond with ONLY the JSON.`;
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
