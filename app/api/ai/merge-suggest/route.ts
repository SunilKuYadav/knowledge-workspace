/**
 * POST /api/ai/merge-suggest
 *
 * AI-assisted merge suggestion endpoint. Given a set of duplicate items
 * (topics or problems), asks AI to produce the best merged version
 * combining metadata from all duplicates.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAIClient } from "@/ai";

const DEFAULT_BASE_URL =
  process.env.OPENAI_BASE_URL || "http://127.0.0.1:1234/v1";
const API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL = process.env.OPENAI_MODEL || "gpt-3.5-turbo";

interface MergeRequestBody {
  type: "topic" | "problem";
  items: Record<string, unknown>[];
}

function buildMergePrompt(type: string, items: Record<string, unknown>[]): string {
  const itemsJson = JSON.stringify(items, null, 2);

  if (type === "topic") {
    return `You are a knowledge management assistant. The user has duplicate topics in their workspace that need to be merged into a single definitive entry.

Given the following duplicate topic entries:

${itemsJson}

Produce a single merged topic JSON object that:
1. Uses the best/most descriptive title from the duplicates
2. Keeps the most advanced status (completed > in-progress > not-started)
3. Keeps the highest confidence level
4. Merges all tags (deduplicated)
5. Merges prerequisites and relatedTopics arrays (deduplicated)
6. Merges relatedProblemIds arrays (deduplicated)
7. Keeps the earliest createdAt and latest updatedAt
8. Uses the most appropriate difficulty (prefer the harder one if studying at that level)
9. Uses the most appropriate category
10. Sets estimatedMinutes to the maximum from all entries

Respond with ONLY valid JSON — no explanation, no markdown fences. The JSON should have the same schema as the input items (minus the "id" field — use the id from the first item).`;
  }

  return `You are a knowledge management assistant. The user has duplicate coding problems in their workspace that need to be merged into a single definitive entry.

Given the following duplicate problem entries:

${itemsJson}

Produce a single merged problem JSON object that:
1. Uses the best/most descriptive title from the duplicates
2. Keeps the most advanced status (solved > attempted > not-started)
3. Merges all companies arrays (deduplicated)
4. Merges all patterns arrays (deduplicated)
5. Keeps the highest attempt count
6. Keeps favorite=true if any entry has it
7. Keeps the URL if any entry has one
8. Keeps the best (most specific) frequency rating
9. Keeps the most recent lastSolved date
10. Keeps the highest revisionCount
11. Keeps the best complexity values (lowest Big-O)
12. Merges relatedTopicIds (deduplicated)
13. Keeps the earliest createdAt and latest updatedAt
14. Uses the most appropriate difficulty

Respond with ONLY valid JSON — no explanation, no markdown fences. The JSON should have the same schema as the input items (minus the "id" field — use the id from the first item).`;
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

    const prompt = buildMergePrompt(body.type, body.items);

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
