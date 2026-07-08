/**
 * POST /api/ai/problem/generate-note
 *
 * Generates a "key things to remember" note from the user's solution
 * and appends/merges it into notes.md.
 *
 * Body: { problemId, solution, title, patterns[] }
 * Returns: { note: string } — the generated markdown note
 */

import { NextRequest, NextResponse } from "next/server";
import { createAIClient } from "@/ai";
import { buildGenerateNotePrompt } from "@/ai/prompts";

const DEFAULT_BASE_URL =
  process.env.OPENAI_BASE_URL || "http://127.0.0.1:1234/v1";
const API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL = process.env.OPENAI_MODEL || "gpt-3.5-turbo";

interface RequestBody {
  solution: string;
  title: string;
  patterns: string[];
  difficulty: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody;

    if (!body.solution || !body.title) {
      return NextResponse.json(
        { error: "Missing required fields: solution, title" },
        { status: 400 },
      );
    }

    const client = createAIClient({
      baseUrl: DEFAULT_BASE_URL,
      apiKey: API_KEY,
      defaultModel: MODEL,
    });

    const available = await client.isAvailable();
    if (!available) {
      return NextResponse.json(
        { error: "AI service is currently unavailable" },
        { status: 503 },
      );
    }

    const prompt = buildGenerateNotePrompt(body);

    // Stream back to client
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of client.generate(prompt)) {
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
