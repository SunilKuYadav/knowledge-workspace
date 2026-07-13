/**
 * Evaluation-based AI sidebar action prompts.
 *
 * Centralizes prompts previously inline in:
 * - app/api/ai/route.ts (buildEvaluationActionPrompt)
 *
 * These prompts power the post-evaluation actions in the AI sidebar:
 * improve-solution, eval-notes, eval-variation, eval-followup.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EvaluationActionContext {
  evaluation: {
    overallScore: number;
    feedback: string;
    strengths: string[];
    improvements: string[];
    complexity: { time: string; space: string };
    edgeCases?: string[];
    alternativeApproaches?: string[];
  };
  code: string;
  problemTitle: string;
  patterns: string[];
  difficulty: string;
}

export interface EvaluationActionConfig {
  experienceLevel: number;
  targetRole?: string;
  [key: string]: unknown;
}

export type EvaluationAction =
  | "improve-solution"
  | "eval-notes"
  | "eval-variation"
  | "eval-followup";

// ─── Builder ────────────────────────────────────────────────────────────────

/**
 * Build a context-rich prompt for evaluation-based AI sidebar actions.
 */
export function buildEvaluationActionPrompt(
  action: EvaluationAction | string,
  ctx: EvaluationActionContext,
  config: EvaluationActionConfig,
): string {
  const { evaluation, code, problemTitle, patterns, difficulty } = ctx;
  const level = config.experienceLevel || 5;

  const baseContext = `You are helping an engineer (${level} YOE) improve their solution to a coding problem.

Problem: ${problemTitle}
Difficulty: ${difficulty}
Patterns: ${patterns.join(", ")}

Their current solution:
\`\`\`typescript
${code}
\`\`\`

AI Evaluation Results (score: ${evaluation.overallScore}/100):
- Feedback: ${evaluation.feedback}
- Strengths: ${evaluation.strengths.join("; ")}
- Areas to Improve: ${evaluation.improvements.join("; ")}
- Complexity: Time ${evaluation.complexity.time}, Space ${evaluation.complexity.space}
${evaluation.edgeCases?.length ? `- Edge Cases: ${evaluation.edgeCases.join("; ")}` : ""}
${evaluation.alternativeApproaches?.length ? `- Alternative Approaches: ${evaluation.alternativeApproaches.join("; ")}` : ""}`;

  switch (action) {
    case "improve-solution":
      return `${baseContext}

Based on the evaluation feedback, write an improved version of the solution that addresses ALL the improvement areas mentioned above. The improved solution should:
1. Fix any weaknesses identified in the evaluation
2. Handle edge cases mentioned
3. Maintain or improve the time/space complexity
4. Be production-quality code

Return the improved solution inside a TypeScript code block (\`\`\`typescript ... \`\`\`). Include comments explaining key improvements inline.`;

    case "eval-notes":
      return `${baseContext}

Generate comprehensive study notes based on this evaluation. The notes should include:
1. **Key Learnings** — What this problem teaches about the patterns involved
2. **Mistakes Made** — What went wrong and why (based on the improvements needed)
3. **Optimization Insights** — Time/space analysis and how to improve
4. **Pattern Recognition** — How to recognize similar problems in interviews
5. **Edge Cases to Remember** — Common edge cases for this pattern

Format as clean Markdown suitable for a personal knowledge base.`;

    case "eval-variation":
      return `${baseContext}

Based on the evaluation feedback, generate an alternative solution that takes a fundamentally different approach. This variation should:
1. Use a different algorithm or data structure than the current solution
2. Address the weaknesses in the current approach
3. Include clear comments explaining the approach
4. Provide better or equal time/space complexity

If the evaluation mentions alternative approaches, implement one of those. Otherwise, choose a well-known alternative approach for this pattern.

Return the complete solution inside a TypeScript code block (\`\`\`typescript ... \`\`\`) with explanatory comments inline. After the code block, briefly explain the approach and its complexity.`;

    case "eval-followup":
      return `${baseContext}

Based on the evaluation, suggest follow-up study actions the user should take. Include:

1. **Immediate Fixes** — Quick improvements they can make to this solution right now
2. **Related Problems** — 3-5 problems that practice the same patterns but at slightly different angles
3. **Concepts to Review** — Specific DSA/algorithm concepts they should deepen
4. **Interview Tips** — How to communicate their approach better in a real interview setting
5. **Next Steps** — What they should practice next based on their score (${evaluation.overallScore}/100)

Be specific and actionable. Reference the actual evaluation feedback.`;

    default:
      return `${baseContext}\n\nProvide helpful guidance based on the evaluation.`;
  }
}
