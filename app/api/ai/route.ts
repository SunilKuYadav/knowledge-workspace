/**
 * API route for AI operations.
 *
 * POST handler accepts { action, itemId, content? } and routes to the
 * appropriate AI function. Streaming actions (summary, explain, interview)
 * return a ReadableStream. Non-streaming actions (quiz, flashcards, similar)
 * return JSON.
 *
 * Requirements: 13.1, 13.2
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getReadyClient,
  generateSummary,
  generateQuiz,
  generateFlashcards,
  explainConcept,
  suggestSimilarProblems,
  generateInterviewPrep,
  buildCustomGeneralPrompt,
  buildCustomItemPrompt,
} from "@/ai";
import { createAIClient } from "@/ai";
import { loadPromptConfig } from "@/ai/prompts/loadConfig";
import { getPromptForAction } from "@/ai/prompts/config";
import { composeWithConfig } from "@/ai/prompts/utils/compose";
import { MARKDOWN_CONTEXT } from "@/ai/prompts/system";
import { getWorkspacePath } from "@/src/lib/constants";
import { FileTopicRepository } from "@/src/filesystem/FileTopicRepository";
import { FileProblemRepository } from "@/src/filesystem/FileProblemRepository";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, itemId, content, prompt, context, isGeneral, evaluationContext } = body as {
      action: string;
      itemId: string;
      content?: string;
      prompt?: string;
      context?: "topic" | "problem";
      isGeneral?: boolean;
      evaluationContext?: {
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
      };
    };

    if (!action || !itemId) {
      return NextResponse.json(
        { error: "Missing required fields: action, itemId" },
        { status: 400 },
      );
    }

    const client = await getReadyClient("ai/route");
    const workspacePath = getWorkspacePath();

    // Custom prompt action — stream the response
    if (action === "custom") {
      if (!prompt) {
        return NextResponse.json(
          { error: "Missing prompt for custom action" },
          { status: 400 },
        );
      }

      // Load user's prompt config for experience-calibrated prompts
      const promptConfig = await loadPromptConfig();
      let fullPrompt: string;

      if (isGeneral) {
        // General question — use config-aware identity + teaching
        fullPrompt = composeWithConfig({
          actionKeys: ["identity", "teaching"],
          extraModules: [MARKDOWN_CONTEXT],
          task: `Answer the following question:\n\n${prompt}`,
          config: promptConfig,
        });
      } else {
        // Item-specific question — include context from the problem/topic
        const contextContent =
          content ||
          (await getItemContextByType(itemId, context || null, workspacePath));
        fullPrompt = composeWithConfig({
          actionKeys: ["identity", "teaching"],
          extraModules: [MARKDOWN_CONTEXT],
          task: `The user is studying a ${context || "topic/problem"}. Here is the relevant context:\n\n${contextContent}\n\nUser question: ${prompt}`,
          config: promptConfig,
        });
      }

      const generator = client.generate(fullPrompt);

      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of generator) {
              controller.enqueue(new TextEncoder().encode(chunk));
            }
            controller.close();
          } catch {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Transfer-Encoding": "chunked",
        },
      });
    }

    // Evaluation-based actions — require evaluationContext
    if (
      (action === "improve-solution" ||
        action === "eval-notes" ||
        action === "eval-variation" ||
        action === "eval-followup") &&
      evaluationContext
    ) {
      const promptConfig = await loadPromptConfig();
      const evalPrompt = buildEvaluationActionPrompt(action, evaluationContext, promptConfig);

      const generator = client.generate(evalPrompt);

      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of generator) {
              controller.enqueue(new TextEncoder().encode(chunk));
            }
            controller.close();
          } catch {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Transfer-Encoding": "chunked",
        },
      });
    }

    // Streaming actions
    if (
      action === "summary" ||
      action === "explain" ||
      action === "interview"
    ) {
      const generator = await getStreamingGenerator(
        action,
        itemId,
        content,
        client,
        workspacePath,
      );

      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of generator) {
              controller.enqueue(new TextEncoder().encode(chunk));
            }
            controller.close();
          } catch {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Transfer-Encoding": "chunked",
        },
      });
    }

    // Non-streaming actions
    if (action === "quiz") {
      const topicContent =
        content || (await getTopicContent(itemId, workspacePath));
      const questions = await generateQuiz(topicContent, client);
      return NextResponse.json({ questions });
    }

    if (action === "flashcards") {
      const topicContent =
        content || (await getTopicContent(itemId, workspacePath));
      const cards = await generateFlashcards(topicContent, client);
      return NextResponse.json({ cards });
    }

    if (action === "similar") {
      const problemRepo = new FileProblemRepository(workspacePath);
      const problem = await problemRepo.getById(itemId);
      if (!problem) {
        return NextResponse.json(
          { error: "Problem not found" },
          { status: 404 },
        );
      }
      const suggestions = await suggestSimilarProblems(problem, client);
      return NextResponse.json({ suggestions });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function getStreamingGenerator(
  action: string,
  itemId: string,
  content: string | undefined,
  client: ReturnType<typeof createAIClient>,
  workspacePath: string,
): Promise<AsyncGenerator<string>> {
  if (action === "summary") {
    const topicContent =
      content || (await getTopicContent(itemId, workspacePath));
    return generateSummary(topicContent, client);
  }

  if (action === "explain") {
    const problemRepo = new FileProblemRepository(workspacePath);
    const problem = await problemRepo.getById(itemId);
    const solutionContent = problem
      ? await problemRepo.getSolution(itemId)
      : "";
    return explainConcept(
      problem?.title || itemId,
      solutionContent || content || "",
      client,
    );
  }

  if (action === "interview") {
    const problemRepo = new FileProblemRepository(workspacePath);
    const problem = await problemRepo.getById(itemId);
    if (!problem) {
      return (async function* () {
        yield "Problem not found.";
      })();
    }
    return generateInterviewPrep(problem, client);
  }

  return (async function* () {
    yield "Unknown action.";
  })();
}

async function getTopicContent(
  itemId: string,
  workspacePath: string,
): Promise<string> {
  const topicRepo = new FileTopicRepository(workspacePath);
  const [overview, notes] = await Promise.all([
    topicRepo.getContent(itemId, "overview"),
    topicRepo.getContent(itemId, "notes"),
  ]);
  return `${overview}\n\n${notes}`.trim();
}

async function getItemContext(
  itemId: string,
  workspacePath: string,
): Promise<string> {
  // Try to get problem context first
  const problemRepo = new FileProblemRepository(workspacePath);
  const problem = await problemRepo.getById(itemId);
  if (problem) {
    const [notes, solution] = await Promise.all([
      problemRepo.getNotes(itemId),
      problemRepo.getSolution(itemId),
    ]);
    return `Problem: ${problem.title}\nDifficulty: ${problem.difficulty}\nPatterns: ${problem.patterns.join(", ")}\n\nNotes:\n${notes}\n\nSolution:\n${solution}`.trim();
  }

  // Fall back to topic context
  return getTopicContent(itemId, workspacePath);
}

/**
 * Get item context using the explicit context type (topic or problem).
 * Falls back to `getItemContext` if context is not specified.
 */
async function getItemContextByType(
  itemId: string,
  contextType: "topic" | "problem" | null,
  workspacePath: string,
): Promise<string> {
  if (contextType === "problem") {
    const problemRepo = new FileProblemRepository(workspacePath);
    const problem = await problemRepo.getById(itemId);
    if (problem) {
      const [notes, solution] = await Promise.all([
        problemRepo.getNotes(itemId),
        problemRepo.getSolution(itemId),
      ]);
      return `Problem: ${problem.title}\nDifficulty: ${problem.difficulty}\nPatterns: ${problem.patterns.join(", ")}\n\nNotes:\n${notes}\n\nSolution:\n${solution}`.trim();
    }
  }

  if (contextType === "topic") {
    return getTopicContent(itemId, workspacePath);
  }

  // Fallback: auto-detect
  return getItemContext(itemId, workspacePath);
}

interface EvaluationContext {
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

interface PromptConfig {
  experienceLevel: number;
  targetRole?: string;
  [key: string]: unknown;
}

/**
 * Build a context-rich prompt for evaluation-based AI sidebar actions.
 */
function buildEvaluationActionPrompt(
  action: string,
  ctx: EvaluationContext,
  config: PromptConfig,
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
