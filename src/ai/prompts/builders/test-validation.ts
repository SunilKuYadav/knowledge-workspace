/**
 * Test case validation prompt builders.
 *
 * Centralizes prompts previously inline in:
 * - app/api/ai/problem/validate-test-cases/route.ts
 * - app/api/ai/coding-interview/validate-test-cases/route.ts
 */

import type { GeneratedProblem } from "@/app/coding-interview/lib/types";

// ─── Problem Test Validation ────────────────────────────────────────────────

export interface ProblemTestValidationParams {
  problemId: string;
  title: string;
  description: string;
  constraints: string[];
  inputFormat?: string;
  outputFormat?: string;
  boilerplate?: string;
  testCases: { input: string; expectedOutput: string }[];
  variationId?: string;
}

export function buildProblemTestValidationPrompt(
  params: ProblemTestValidationParams,
): string {
  const casesStr = params.testCases
    .map(
      (tc, i) =>
        `  Case ${i + 1}: Input: ${tc.input} → Expected: ${tc.expectedOutput}`,
    )
    .join("\n");

  return `You are a senior software engineer. Validate whether each test case has the CORRECT expected output for the given problem.

Problem: ${params.title}
Description:
${params.description.slice(0, 2000)}

Constraints: ${params.constraints.join("; ")}
${params.inputFormat ? `Input Format: ${params.inputFormat}` : ""}
${params.outputFormat ? `Output Format: ${params.outputFormat}` : ""}
${params.boilerplate ? `Function Signature:\n\`\`\`typescript\n${params.boilerplate}\n\`\`\`` : ""}

Test Cases to Validate:
${casesStr}

For EACH test case:
1. Manually trace the correct algorithm to compute the expected output
2. Compare your computed output with the given expected output
3. If they don't match, provide the corrected output

Return ONLY a valid JSON array (no markdown, no explanation outside JSON):
[
  {
    "index": 0,
    "input": "the input string",
    "expectedOutput": "the given expected output",
    "isValid": true or false,
    "correctedOutput": "correct output if isValid is false, omit if valid",
    "reason": "brief explanation of why it's wrong, omit if valid"
  }
]

IMPORTANT: Be rigorous. Manually compute the answer for each case. Do NOT assume the given expected outputs are correct.`;
}

// ─── Coding Interview Test Validation ───────────────────────────────────────

export function buildCodingInterviewTestValidationPrompt(
  problem: GeneratedProblem,
): string {
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
