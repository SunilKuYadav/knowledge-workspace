/**
 * POST /api/ai/problem/generate-description
 *
 * Generates a full problem description with test cases from problem metadata,
 * persists it to description.json, and returns the result.
 *
 * Body: { problemId, title, difficulty, patterns[], companies[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { createAIClient } from "@/ai";
import { getWorkspacePath } from "@/src/lib/constants";
import { FileProblemRepository } from "@/src/filesystem/FileProblemRepository";
import type { ProblemDescription } from "@/types";

const DEFAULT_BASE_URL =
  process.env.OPENAI_BASE_URL || "http://127.0.0.1:1234/v1";
const API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL = process.env.OPENAI_MODEL || "gpt-3.5-turbo";

interface RequestBody {
  problemId: string;
  title: string;
  difficulty: string;
  patterns: string[];
  companies: string[];
  url?: string;
}

function buildPrompt(body: RequestBody): string {
  return `You are a senior software engineer and coding interview expert.

Generate a complete problem description for the following LeetCode-style coding problem.
The output must be compatible with both a problem workspace and a timed coding interview module.

Problem Title: ${body.title}
Difficulty: ${body.difficulty}
Patterns: ${body.patterns.join(", ")}
Companies: ${body.companies.join(", ") || "Not specified"}
${body.url ? `Original URL: ${body.url}` : ""}

Return ONLY a valid JSON object with this exact structure (no markdown, no commentary):
{
  "description": "Full problem statement in Markdown. Include context, requirements, and any relevant background.",
  "category": "string - primary category e.g., Arrays, Trees, Dynamic Programming, Graphs, Strings, etc.",
  "tags": ["string array - at least 2 relevant algorithm/data-structure tags from the patterns"],
  "constraints": ["1 <= n <= 10^5", "...", "..."],
  "inputFormat": "string - description of what the function receives as input",
  "outputFormat": "string - description of what the function should return",
  "examples": [
    {
      "input": "nums = [2,7,11,15], target = 9",
      "expectedOutput": "[0,1]",
      "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]."
    },
    {
      "input": "nums = [3,2,4], target = 6",
      "expectedOutput": "[1,2]",
      "explanation": "Because nums[1] + nums[2] == 6, we return [1, 2]."
    }
  ],
  "edgeCases": [
    {
      "description": "string - what edge case this tests",
      "input": "string - edge case input",
      "expectedOutput": "string - expected output for this edge case"
    }
  ],
  "testCases": [
    { "input": "...", "expectedOutput": "..." },
    { "input": "...", "expectedOutput": "..." },
    { "input": "...", "expectedOutput": "..." },
    { "input": "...", "expectedOutput": "..." },
    { "input": "...", "expectedOutput": "..." }
  ],
  "timeComplexity": "O(n)",
  "spaceComplexity": "O(n)",
  "companyTags": ["string array - 1 to 5 companies known to ask this or similar questions"],
  "boilerplate": "function twoSum(nums: number[], target: number): number[] {\\n  // Your code here\\n}"
}

Requirements:
- description: comprehensive, interview-quality problem statement in Markdown
- category: a single primary category (e.g., Arrays, Trees, Dynamic Programming)
- tags: at least 2 algorithm/data-structure tags
- constraints: realistic input constraints (3-6 items)
- inputFormat: clear description of function parameters
- outputFormat: clear description of expected return value
- examples: 2-3 worked examples with step-by-step explanations
- edgeCases: at least 2 edge cases with description, input, and expectedOutput
- testCases: 5-8 hidden test cases covering normal and edge scenarios
- timeComplexity / spaceComplexity: the expected optimal solution complexity in Big-O
- companyTags: 1-5 companies that ask this or similar questions
- boilerplate: TypeScript function signature with a TODO comment
- The problem must be solvable within 45 minutes in an interview setting

Respond with ONLY the JSON. No markdown fences, no extra text.`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody;

    if (!body.problemId || !body.title || !body.difficulty) {
      return NextResponse.json(
        { error: "Missing required fields: problemId, title, difficulty" },
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

    // Strip markdown fences if present
    let jsonStr = raw.trim();
    const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();

    // Extract JSON object
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
    const description: ProblemDescription = {
      problemId: body.problemId,
      description: String(parsed.description || ""),
      category: String(parsed.category || ""),
      tags: Array.isArray(parsed.tags)
        ? (parsed.tags as string[]).map(String)
        : body.patterns || [],
      constraints: Array.isArray(parsed.constraints)
        ? (parsed.constraints as string[]).map(String)
        : [],
      inputFormat: String(parsed.inputFormat || ""),
      outputFormat: String(parsed.outputFormat || ""),
      examples: Array.isArray(parsed.examples)
        ? (parsed.examples as Array<Record<string, string>>).map((e) => ({
            input: String(e.input || ""),
            expectedOutput: String(e.expectedOutput || e.output || ""),
            explanation: String(e.explanation || ""),
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
      companyTags: Array.isArray(parsed.companyTags)
        ? (parsed.companyTags as string[]).map(String)
        : body.companies || [],
      boilerplate: String(parsed.boilerplate || ""),
      variations: [],
      linkedSimilar: [],
      generatedAt: now,
      updatedAt: now,
    };

    // Persist to disk
    const workspacePath = getWorkspacePath();
    const repo = new FileProblemRepository(workspacePath);
    await repo.saveDescription(body.problemId, description);

    return NextResponse.json({ description });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
