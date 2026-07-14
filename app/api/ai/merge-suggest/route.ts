/**
 * POST /api/ai/merge-suggest
 *
 * AI-assisted merge suggestion endpoint. Given a set of duplicate items
 * (topics or problems), asks AI to produce the best merged version
 * combining metadata from all duplicates.
 */

import { NextRequest, NextResponse } from "next/server";
import { getReadyClient } from "@/ai";
import { buildMergePrompt } from "@/src/ai/prompts/builders";

interface MergeRequestBody {
  type: "topic" | "problem";
  items: Record<string, unknown>[];
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MergeRequestBody;

    if (!body.type || !body.items || body.items.length < 2) {
      return NextResponse.json(
        { error: "Missing required fields: type, items (at least 2)" },
        { status: 400 },
      );
    }

    const client = await getReadyClient("ai/merge-suggest");

    const available = await client.isAvailable();
    if (!available) {
      return NextResponse.json(
        { error: "AI service is currently unavailable" },
        { status: 503 },
      );
    }

    const prompt = buildMergePrompt({ type: body.type, items: body.items });

    let raw = "";
    for await (const chunk of client.generate(prompt)) {
      raw += chunk;
    }

    // Parse JSON response
    let jsonStr = raw.trim();
    const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();

    const firstBrace = jsonStr.indexOf("{");
    const lastBrace = jsonStr.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(jsonStr);
    return NextResponse.json({ merged: parsed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
