/**
 * POST /api/ai/problem/generate-variation
 *
 * Generates a variation of an existing problem. Returns full problem
 * definition that can be saved and practiced independently.
 *
 * Body: { problemId, title, description, difficulty, patterns[] }
 * Returns: { variation: ProblemVariation }
 */

import { NextRequest, NextResponse } from "next/server";
import { createAIClient } from "@/ai";
import { getWorkspacePath } from "@/src/lib/constants";
import { FileProblemRepository } from "@/src/filesystem/FileProblemRepository";
import type { ProblemDescription, ProblemVariation } from "@/types";
import { v4 as uuid } from "uuid";

const DEFAULT_BASE_URL =
  process.env.OPENAI_BASE_URL || "http://127.0.0.1:1234/v1";
const API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL = process.env.OPENAI_MODEL || "gpt-3.5-turbo";

interface RequestBody {
  problemId: string;
  title: string;
  description: string;
  difficulty: string;
  patterns: string[];
}

function buildPrompt(body: RequestBody): string {
  return `You are a senior software engineer creating coding problem variations for interview prep.
The output must be compatible with a timed coding interview module.

Based on this original problem, generate a VARIATION — a different problem that tests the same core pattern(s) but with a twist.

Original Problem: ${body.title}
Difficulty: ${body.difficulty}
Patterns: ${body.patterns.join(", ")}

Original Description:
${body.description.slice(0, 1500)}

Generate a variation. The variation should:
- Test the same pattern(s) but with a different scenario or constraint
- Be a standalone problem (someone could solve it without seeing the original)
- Have a different difficulty level if appropriate (can be easier or harder)
- Include enough detail to be used directly in a coding interview session

Return ONLY a valid JSON object:
{
  "title": "Variation title",
  "description": "Full problem statement in Markdown — comprehensive, interview-quality",
  "difficulty": "easy" | "medium" | "hard",
  "category": "string - primary category e.g., Arrays, Trees, Dynamic Programming",
  "tags": ["string array - at least 2 relevant algorithm/data-structure tags"],
  "constraints": ["string array - realistic input constraints"],
  "inputFormat": "string - description of what the function receives",
  "outputFormat": "string - description of expected return value",
  "samples": [
    { "input": "...", "output": "...", "explanation": "step-by-step explanation" }
  ],
  "edgeCases": [
    { "description": "what edge case this tests", "input": "...", "expectedOutput": "..." }
  ],
  "testCases": [
    { "input": "...", "expectedOutput": "..." }
  ],
  "timeComplexity": "O(...)",
  "spaceComplexity": "O(...)",
  "boilerplate": "TypeScript function signature with TODO comment",
  "hint": "A one-line hint about the approach"
}

Requirements:
- description: clear, self-contained problem statement in Markdown
- category: a single primary category
- tags: at least 2 items
- constraints: 2-5 realistic constraints
- inputFormat / outputFormat: clear descriptions
- samples: at least 2 items with input, output, and explanation
- edgeCases: at least 2 items
- testCases: at least 5 items covering various scenarios
- timeComplexity / spaceComplexity: valid Big-O notation
- boilerplate: valid TypeScript code with a clear function signature
- The variation must genuinely be different from the original (not just renaming variables)
- The problem must be solvable within 45 minutes

Respond with ONLY the JSON. No markdown fences.`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody;

    if (!body.problemId || !body.title) {
      return NextResponse.json(
        { error: "Missing required fields: problemId, title" },
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

    const prompt = buildPrompt(body);
    let raw = "";
    for await (const chunk of client.generate(prompt)) {
      raw += chunk;
    }

    // Parse JSON
    let jsonStr = raw.trim();
    const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();

    const firstBrace = jsonStr.indexOf("{");
    const lastBrace = jsonStr.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { error: "AI returned invalid JSON. Please try again." },
        { status: 502 },
      );
    }

    const now = new Date().toISOString();
    const variation: ProblemVariation = {
      id: uuid(),
      title: String(parsed.title || `${body.title} - Variation`),
      description: String(parsed.description || ""),
      difficulty: (["easy", "medium", "hard"].includes(
        String(parsed.difficulty),
      )
        ? String(parsed.difficulty)
        : body.difficulty) as "easy" | "medium" | "hard",
      category: String(parsed.category || ""),
      tags: Array.isArray(parsed.tags)
        ? (parsed.tags as string[]).map(String)
        : body.patterns || [],
      constraints: Array.isArray(parsed.constraints)
        ? (parsed.constraints as string[]).map(String)
        : [],
      inputFormat: String(parsed.inputFormat || ""),
      outputFormat: String(parsed.outputFormat || ""),
      samples: Array.isArray(parsed.samples)
        ? (parsed.samples as Array<Record<string, string>>).map((s) => ({
            input: String(s.input || ""),
            output: String(s.output || ""),
            explanation: String(s.explanation || ""),
          }))
        : [],
      edgeCases: Array.isArray(parsed.edgeCases)
        ? (parsed.edgeCases as Array<Record<string, string>>).map((ec) => ({
            description: String(ec.description || ""),
            input: String(ec.input || ""),
            expectedOutput: String(ec.expectedOutput || ""),
          }))
        : [],
      testCases: Array.isArray(parsed.testCases)
        ? (parsed.testCases as Array<Record<string, string>>).map((tc) => ({
            input: String(tc.input || ""),
            expectedOutput: String(tc.expectedOutput || tc.output || ""),
          }))
        : [],
      timeComplexity: String(parsed.timeComplexity || ""),
      spaceComplexity: String(parsed.spaceComplexity || ""),
      boilerplate: typeof parsed.boilerplate === "string" ? parsed.boilerplate : undefined,
      hint: typeof parsed.hint === "string" ? parsed.hint : undefined,
      createdAt: now,
      sourceId: body.problemId,
    };

    // Append to description.json variations array
    const workspacePath = getWorkspacePath();
    const repo = new FileProblemRepository(workspacePath);
    const existing = await repo.getDescription(body.problemId);

    if (existing) {
      const updatedDescription: ProblemDescription = {
        ...existing,
        variations: [...(existing.variations || []), variation],
        updatedAt: now,
      };
      await repo.saveDescription(body.problemId, updatedDescription);
    }

    return NextResponse.json({ variation });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
