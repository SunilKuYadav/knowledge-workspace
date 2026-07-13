/**
 * Solution evaluation prompt builder.
 *
 * Centralizes prompts previously inline in:
 * - app/api/ai/problem/evaluate-solution/route.ts
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TestResultInput {
  input: unknown;
  expectedOutput: unknown;
  actualOutput: unknown;
  passed: boolean;
}

export interface EvaluateSolutionParams {
  code: string;
  problemId: string;
  title: string;
  description: string;
  difficulty: string;
  patterns: string[];
  constraints: string[];
  testResults: TestResultInput[];
}

// ─── Builder ────────────────────────────────────────────────────────────────

export function buildEvaluateSolutionPrompt(
  params: EvaluateSolutionParams,
  experienceLevel: number,
  targetRole: string,
): string {
  const passed = params.testResults.filter((r) => r.passed).length;
  const total = params.testResults.length;

  const failedCases = params.testResults
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

Problem: ${params.title}
Difficulty: ${params.difficulty}
Patterns: ${params.patterns.join(", ")}
Constraints: ${params.constraints.join("; ")}

Problem Description:
${params.description.slice(0, 2000)}

Submitted Code:
\`\`\`typescript
${params.code}
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
