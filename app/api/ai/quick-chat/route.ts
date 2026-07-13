/**
 * API route for Quick Chat — uses the "fast" model tier for quick
 * questions, brainstorming, and general assistance.
 *
 * POST accepts { prompt, summary? } and streams the response.
 * The optional `summary` field provides context from previous conversation turns.
 */

import { NextRequest, NextResponse } from "next/server";
import { getReadyClient } from "@/ai";
import { loadPromptConfig } from "@/ai/prompts/loadConfig";
import { composeWithConfig } from "@/ai/prompts/utils/compose";
import { MARKDOWN_CONTEXT } from "@/ai/prompts/system";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, summary } = body as {
      prompt: string;
      summary?: string;
    };

    if (!prompt) {
      return NextResponse.json(
        { error: "Missing required field: prompt" },
        { status: 400 },
      );
    }

    const client = await getReadyClient("ai/quick-chat");
    const promptConfig = await loadPromptConfig();

    const taskParts: string[] = [];

    if (summary) {
      taskParts.push(
        "Below is a summary of our conversation so far:",
        "---",
        summary,
        "---",
        "",
      );
    }

    taskParts.push(
      "Answer the following question concisely and helpfully:",
      "",
      prompt,
    );

    const fullPrompt = composeWithConfig({
      actionKeys: ["identity", "teaching"],
      extraModules: [MARKDOWN_CONTEXT],
      task: taskParts.join("\n"),
      config: promptConfig,
    });

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
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
