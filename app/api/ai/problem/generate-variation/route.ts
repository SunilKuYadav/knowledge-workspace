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
import { buildGenerateVariationPrompt } from "@/ai/prompts";
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

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody;
    const streamMode = request.headers.get("x-stream") === "true";

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

    const prompt = buildGenerateVariationPrompt(body);

    // Streaming mode
    if (streamMode) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          let raw = "";
          try {
            for await (const chunk of client.generate(prompt)) {
              raw += chunk;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "token", content: chunk })}\n\n`),
              );
            }

            const variation = parseAndBuildVariation(raw, body);
            if (variation) {
              // Persist
              const workspacePath = getWorkspacePath();
              const repo = new FileProblemRepository(workspacePath);
              const existing = await repo.getDescription(body.problemId);
              if (existing) {
                const updatedDescription: ProblemDescription = {
                  ...existing,
                  variations: [...(existing.variations || []), variation],
                  updatedAt: new Date().toISOString(),
                };
                await repo.saveDescription(body.problemId, updatedDescription);
              }
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "done", variation })}\n\n`),
              );
            } else {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "error", error: "AI returned invalid JSON. Please try again." })}\n\n`),
              );
            }
          } catch {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "error", error: "Generation failed" })}\n\n`),
            );
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Non-streaming mode (original behavior)
    let raw = "";
    for await (const chunk of client.generate(prompt)) {
      raw += chunk;
    }

    const variation = parseAndBuildVariation(raw, body);
    if (!variation) {
      return NextResponse.json(
        { error: "AI returned invalid JSON. Please try again." },
        { status: 502 },
      );
    }

    // Append to description.json variations array
    const workspacePath = getWorkspacePath();
    const repo = new FileProblemRepository(workspacePath);
    const existing = await repo.getDescription(body.problemId);

    if (existing) {
      const updatedDescription: ProblemDescription = {
        ...existing,
        variations: [...(existing.variations || []), variation],
        updatedAt: new Date().toISOString(),
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

function parseAndBuildVariation(
  raw: string,
  body: RequestBody,
): ProblemVariation | null {
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
    return null;
  }

  const now = new Date().toISOString();
  return {
    id: uuid(),
    title: String(parsed.title || `${body.title} - Variation`),
    description: String(parsed.description || ""),
    difficulty: (["easy", "medium", "hard"].includes(String(parsed.difficulty))
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
    boilerplate:
      typeof parsed.boilerplate === "string" ? parsed.boilerplate : undefined,
    hint: typeof parsed.hint === "string" ? parsed.hint : undefined,
    createdAt: now,
    sourceId: body.problemId,
  };
}
