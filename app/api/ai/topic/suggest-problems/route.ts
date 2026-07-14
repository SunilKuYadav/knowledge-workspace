/**
 * POST /api/ai/topic/suggest-problems
 *
 * Given a topic's metadata and content (artifacts), AI suggests 5-10 coding problems
 * that cover the topic's key concepts. Returns structured metadata for each suggestion.
 *
 * Body: {
 *   topicId: string,
 *   topicTitle: string,
 *   category: string,
 *   tags: string[],
 *   difficulty: string,
 *   artifactContent: string,    // Concatenated artifact markdown (overview + notes + patterns etc.)
 *   semanticDescription?: { intent, targetLevel, focus, ... }
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { getReadyClient } from "@/ai";
import { loadPromptConfig } from "@/src/ai/prompts/loadConfig";
import { buildSuggestProblemsPrompt } from "@/ai/prompts/builders/topic-problems";
import type { SemanticDescription } from "@/types";

interface RequestBody {
  topicId: string;
  topicTitle: string;
  category: string;
  tags: string[];
  difficulty: string;
  artifactContent: string;
  semanticDescription?: SemanticDescription;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody;

    if (!body.topicId || !body.topicTitle || !body.artifactContent) {
      return NextResponse.json(
        { error: "Missing required fields: topicId, topicTitle, artifactContent" },
        { status: 400 },
      );
    }

    const client = await getReadyClient("ai/topic/suggest-problems");
    const available = await client.isAvailable();
    if (!available) {
      return NextResponse.json(
        { error: "AI service is currently unavailable" },
        { status: 503 },
      );
    }

    const config = await loadPromptConfig();
    const prompt = buildSuggestProblemsPrompt(body, config.experienceLevel, config.targetRole);

    let raw = "";
    for await (const chunk of client.generate(prompt)) {
      raw += chunk;
    }

    const suggestions = parseSuggestions(raw);
    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function parseSuggestions(raw: string): Array<{
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  description: string;
  patterns: string[];
  companies: string[];
  rationale: string;
  generated: boolean;
}> {
  try {
    let jsonStr = raw.trim();
    // Handle markdown code fences
    const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();
    // Find JSON array
    const firstBracket = jsonStr.indexOf("[");
    const lastBracket = jsonStr.lastIndexOf("]");
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      jsonStr = jsonStr.slice(firstBracket, lastBracket + 1);
    }

    const parsed = JSON.parse(jsonStr) as Array<Record<string, unknown>>;

    return parsed.map((item, i) => ({
      id: `suggestion-${i}-${Date.now()}`,
      title: String(item.title || `Problem ${i + 1}`),
      difficulty: validateDifficulty(item.difficulty),
      description: String(item.description || ""),
      patterns: Array.isArray(item.patterns) ? item.patterns.map(String) : [],
      companies: Array.isArray(item.companies) ? item.companies.map(String) : [],
      rationale: String(item.rationale || ""),
      generated: false,
    }));
  } catch {
    return [];
  }
}

function validateDifficulty(d: unknown): "easy" | "medium" | "hard" {
  if (d === "easy" || d === "medium" || d === "hard") return d;
  return "medium";
}
