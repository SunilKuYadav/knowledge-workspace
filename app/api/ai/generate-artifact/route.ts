/**
 * API route for generating a topic artifact via AI.
 *
 * POST { topicId, artifact, topic, category }
 *   → streams the generated markdown and saves it to the topic folder.
 *
 * The file is written to disk as generation completes so the tab
 * is immediately available after the stream closes.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAIClient } from "@/ai";
import { buildArtifactPrompt } from "@/src/ai/prompts";
import { ArtifactSchema } from "@/types";
import { getWorkspacePath } from "@/src/lib/constants";
import { FileTopicRepository } from "@/src/filesystem/FileTopicRepository";

const DEFAULT_BASE_URL =
  process.env.OPENAI_BASE_URL || "http://127.0.0.1:1234/v1";
const API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL = process.env.OPENAI_MODEL || "gpt-3.5-turbo";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topicId, artifact, topic, category } = body as {
      topicId: string;
      artifact: string;
      topic: string;
      category: string;
    };

    if (!topicId || !artifact || !topic || !category) {
      return NextResponse.json(
        { error: "Missing required fields: topicId, artifact, topic, category" },
        { status: 400 },
      );
    }

    // Validate artifact type
    const parsed = ArtifactSchema.safeParse(artifact);
    if (!parsed.success) {
      return NextResponse.json(
        { error: `Unknown artifact type: "${artifact}"` },
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

    const prompt = buildArtifactPrompt(topic, category, parsed.data);
    const workspacePath = getWorkspacePath();
    const repo = new FileTopicRepository(workspacePath);

    // Stream the response back to the client while accumulating for disk write
    let accumulated = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of client.generate(prompt)) {
            accumulated += chunk;
            controller.enqueue(new TextEncoder().encode(chunk));
          }

          // Persist the completed artifact to disk
          await repo.saveContent(topicId, artifact, accumulated);

          controller.close();
        } catch (err) {
          controller.error(err);
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
