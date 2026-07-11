/**
 * POST /api/ai/coding-interview/validate-test-cases
 *
 * Validates and fixes hidden test cases for a coding interview problem.
 * Ensures inputs are proper JSON arrays of function arguments and
 * expected outputs are correct.
 *
 * Body: { problem: GeneratedProblem }
 * Returns: { hiddenTestCases, corrections, isValid }
 */

import { NextRequest, NextResponse } from "next/server";
import { getReadyClient } from "@/ai";
import { AI_TIMEOUT } from "@/app/coding-interview/lib/constants";
import type { GeneratedProblem } from "@/app/coding-interview/lib/types";

interface Correction {
  index: number;
  original: { input: unknown; expectedOutput: unknown };
  corrected: { input: unknown; expectedOutput: unknown };
  reason: string;
}

interface ValidationResponse {
  hiddenTestCases: Array<{ input: unknown; expectedOutput: unknown }>;
  corrections: Correction[];
}

function buildValidationPrompt(problem: GeneratedProblem): string {
  const testCasesStr = problem.hiddenTestCases
    .map(
      (tc, i) =>
        `  ${i + 1}. input: ${JSON.stringify(tc.input)} → expectedOutput: ${JSON.stringify(tc.expectedOutput)}`,
    )
    .join("\n");

  return `You are a senior software engineer. Validate and fix ALL hidden test cases for this coding problem.

## Problem
Title: ${problem.title}
Category: ${problem.category}
Difficulty: ${problem.difficulty}

Statement:
${problem.statement}

Constraints: ${problem.constraints.join("; ")}
Input Format: ${problem.inputFormat}
Output Format: ${problem.outputFormat}
Expected Time Complexity: ${problem.expectedTimeComplexity}
Expected Space Complexity: ${problem.expectedSpaceComplexity}

## Function Signature (boilerplate)
\`\`\`typescript
${problem.boilerplate}
\`\`\`

## Hidden Test Cases to Validate
${testCasesStr}

## VALIDATION RULES
1. Each "input" MUST be a JSON array of function arguments matching the boilerplate signature.
   - If the function is \`subarraySum(nums: number[], k: number)\`, input must be like [[1,2,3], 3]
   - If the function is \`twoSum(nums: number[], target: number)\`, input must be like [[2,7,11,15], 9]
   - If the function is \`isValid(s: string)\`, input must be like ["(())"]
   - NEVER use string representations like "nums = [1,2,3]" or "1 2 3\\n4"
2. Each "expectedOutput" MUST be the actual JSON return value of the function when called with those inputs.
   - Numbers: 4 (not "4")
   - Booleans: true (not "true")
   - Arrays: [0,1] (not "[0,1]")
   - Strings: "hello"
   - null: null
3. Manually trace through a correct optimal algorithm to verify each expected output is correct.
4. Fix any test case where:
   - The input format is wrong (not a JSON array of arguments)
   - The expected output is incorrect
   - The input is a string representation instead of actual values

## RESPONSE FORMAT
Return ONLY a valid JSON object (no markdown, no code blocks):
{
  "hiddenTestCases": [
    { "input": [arg1, arg2, ...], "expectedOutput": <correct_value> }
  ],
  "corrections": [
    {
      "index": <0-based index>,
      "original": { "input": <original>, "expectedOutput": <original> },
      "corrected": { "input": <fixed>, "expectedOutput": <fixed> },
      "reason": "brief explanation"
    }
  ]
}

IMPORTANT:
- Return ALL hiddenTestCases (not just fixed ones) with correct format.
- Only list actually-changed cases in "corrections".
- If all test cases are already correct and properly formatted, return them unchanged with empty corrections array.`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { problem: GeneratedProblem };

    if (!body.problem) {
      return NextResponse.json(
        { error: "Missing required field: problem" },
        { status: 400 },
      );
    }

    const client = await getReadyClient(
      "ai/coding-interview/validate-test-cases",
    );
    const prompt = buildValidationPrompt(body.problem);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT);

    let fullResponse = "";

    try {
      const generator = client.generate(prompt);
      for await (const chunk of generator) {
        if (controller.signal.aborted) break;
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
          { error: "Validation timed out" },
          { status: 504 },
        );
      }
      throw err;
    }

    // Parse JSON from response
    let jsonStr = fullResponse.trim();
    if (jsonStr.startsWith("```json")) jsonStr = jsonStr.slice(7);
    else if (jsonStr.startsWith("```")) jsonStr = jsonStr.slice(3);
    if (jsonStr.endsWith("```")) jsonStr = jsonStr.slice(0, -3);
    jsonStr = jsonStr.trim();

    let parsed: ValidationResponse;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI validation response" },
        { status: 502 },
      );
    }

    // Basic structure validation
    if (!Array.isArray(parsed.hiddenTestCases)) {
      return NextResponse.json(
        { error: "AI response missing hiddenTestCases array" },
        { status: 502 },
      );
    }

    const isValid = !parsed.corrections || parsed.corrections.length === 0;

    return NextResponse.json({
      hiddenTestCases: parsed.hiddenTestCases,
      corrections: parsed.corrections || [],
      isValid,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
