/**
 * API route for generating markdown text via AI.
 *
 * POST handler accepts { prompt, context? } and streams generated
 * markdown content back to the client.
 */

import { NextRequest, NextResponse } from "next/server";
import { getReadyClient } from "@/ai";
import { buildGenerateTextPrompt } from "@/src/ai/prompts";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, context } = body as {
      prompt: string;
      context?: string;
    };

    if (!prompt) {
      return NextResponse.json(
        { error: "Missing required field: prompt" },
        { status: 400 },
      );
    }

    const client = await getReadyClient("ai/generate-text");

    const available = await client.isAvailable();
    if (!available) {
      return NextResponse.json(
        { error: "AI service is currently unavailable" },
        { status: 503 },
      );
    }

    const systemPrompt = buildGenerateTextPrompt(prompt, context);

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
