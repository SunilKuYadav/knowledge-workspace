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

function buildSuggestProblemsPrompt(
  body: RequestBody,
  experienceLevel: number,
  targetRole: string,
): string {
  const levelContext = experienceLevel === 1
    ? "Target: Junior/Mid engineer (L3/L4). Suggest problems that build foundational understanding — brute-force is acceptable. Focus on the most commonly asked easy-to-medium problems."
    : experienceLevel === 5
      ? `Target: Senior engineer (${targetRole || "L4/L5"}). Suggest problems requiring pattern recognition, efficient solutions, and solid edge case awareness.`
      : experienceLevel === 10
        ? `Target: Staff engineer (${targetRole || "L5/L6"}). Suggest problems that test optimization, advanced data structures, and algorithmic depth.`
        : `Target: Principal engineer (${targetRole || "L6/L7"}). Suggest challenging problems requiring elegant solutions, deep algorithmic insight, and creative approaches.`;

  const semanticContext = body.semanticDescription
    ? `\nLearning context: ${body.semanticDescription.intent || ""}\nFocus areas: ${body.semanticDescription.focus?.join(", ") || "general"}\nTarget level: ${body.semanticDescription.targetLevel || "default"}`
    : "";

  // Truncate artifact content to keep prompt manageable
  const content = body.artifactContent.slice(0, 6000);

  return `You are an expert coding interview coach. Based on the following topic content, suggest 5-8 coding problems that would help a user practice and master this SPECIFIC topic.

CRITICAL: Every problem you suggest MUST directly test concepts, techniques, or patterns from the topic "${body.topicTitle}" (${body.category}). Do NOT suggest generic problems. Each problem must require applying knowledge from this topic to solve it.

${levelContext}
${semanticContext}

Topic: ${body.topicTitle}
Category: ${body.category}
Tags: ${body.tags.join(", ")}
Difficulty: ${body.difficulty}

Topic Content (use this to identify the specific concepts, algorithms, and patterns to test):
${content}

For each problem, provide:
1. A clear, concise title (like you'd see on LeetCode)
2. Difficulty (easy/medium/hard) — mix difficulties appropriately for the target level
3. A 1-2 sentence problem description
4. Relevant patterns/techniques from THIS topic that it tests
5. Companies known to ask similar problems
6. A brief rationale explaining EXACTLY which concept from the topic content above this problem exercises

Return ONLY a valid JSON array with this structure:
[
  {
    "title": "Problem Title",
    "difficulty": "easy" | "medium" | "hard",
    "description": "Brief problem description",
    "patterns": ["pattern1", "pattern2"],
    "companies": ["Google", "Meta"],
    "rationale": "Tests [specific concept from topic]: [why this problem requires it]"
  }
]

Guidelines:
- EVERY problem must directly exercise concepts found in the topic content above
- Reference specific algorithms, data structures, or techniques mentioned in the topic
- Include a progression: start with problems that test individual concepts, then combine them
- Prefer problems commonly asked at FAANG companies
- Each problem should test a DISTINCT aspect of the topic — no overlap
- Be specific — "Two Sum" not "Array problem"
- The rationale MUST reference a specific concept from the topic content

Respond with ONLY the JSON array.`;
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
