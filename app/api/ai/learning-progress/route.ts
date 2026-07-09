/**
 * API route for AI-powered learning progress analysis.
 *
 * POST handler accepts the user's current knowledge base data and experience level,
 * then streams back either:
 * - A readiness assessment comparing current coverage to target level requirements
 * - A study plan for uncovered/weak areas
 * - Suggested subtopics or problems to study next
 */

import { NextRequest, NextResponse } from "next/server";
import { getReadyClient } from "@/ai";
import { loadPromptConfig } from "@/src/ai/prompts/loadConfig";
import { buildLearningProgressPrompt } from "@/src/ai/prompts/builders";
import type { ProgressAction, CoverageStats } from "@/src/ai/prompts/builders";

interface ProgressRequestBody {
  action: ProgressAction;
  category?: string;
  topicsSummary: string;
  problemsSummary: string;
  coverageStats: CoverageStats;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ProgressRequestBody;

    if (!body.action) {
      return NextResponse.json(
        { error: "Missing required field: action" },
        { status: 400 },
      );
    }

    const config = await loadPromptConfig();
    const client = await getReadyClient("ai/learning-progress");

    const available = await client.isAvailable();
    if (!available) {
      return NextResponse.json(
        { error: "AI service is currently unavailable" },
        { status: 503 },
      );
    }

    const systemPrompt = buildLearningProgressPrompt({
      action: body.action,
      category: body.category,
      topicsSummary: body.topicsSummary,
      problemsSummary: body.problemsSummary,
      coverageStats: body.coverageStats,
      config,
    });

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of client.generate(systemPrompt)) {
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
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
