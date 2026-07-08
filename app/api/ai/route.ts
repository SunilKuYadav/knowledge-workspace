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
  createAIClient,
  generateSummary,
  generateQuiz,
  generateFlashcards,
  explainConcept,
  suggestSimilarProblems,
  generateInterviewPrep,
  buildCustomGeneralPrompt,
  buildCustomItemPrompt,
} from "@/ai";
import { loadPromptConfig } from "@/ai/prompts/loadConfig";
import { getPromptForAction } from "@/ai/prompts/config";
import { composeWithConfig } from "@/ai/prompts/utils/compose";
import { MARKDOWN_CONTEXT } from "@/ai/prompts/system";
import { getWorkspacePath } from "@/src/lib/constants";
import { FileTopicRepository } from "@/src/filesystem/FileTopicRepository";
import { FileProblemRepository } from "@/src/filesystem/FileProblemRepository";

const DEFAULT_BASE_URL =
  process.env.OPENAI_BASE_URL || "http://127.0.0.1:1234/v1";
const API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL = process.env.OPENAI_MODEL || "gpt-3.5-turbo";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, itemId, content, prompt, context, isGeneral } = body as {
      action: string;
      itemId: string;
      content?: string;
      prompt?: string;
      context?: "topic" | "problem";
      isGeneral?: boolean;
    };

    if (!action || !itemId) {
      return NextResponse.json(
        { error: "Missing required fields: action, itemId" },
        { status: 400 },
      );
    }

    const client = createAIClient({
      baseUrl: DEFAULT_BASE_URL,
      apiKey: API_KEY,
      defaultModel: MODEL,
    });
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
