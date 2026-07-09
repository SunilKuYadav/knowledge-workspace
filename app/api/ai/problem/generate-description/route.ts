/**
 * POST /api/ai/problem/generate-description
 *
 * Generates a full problem description with test cases from problem metadata,
 * persists it to description.json, and returns the result.
 *
 * Body: { problemId, title, difficulty, patterns[], companies[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { createAIClient, getModelForRoute } from "@/ai";
import { buildGenerateDescriptionPrompt } from "@/ai/prompts";
import { getWorkspacePath } from "@/src/lib/constants";
import { FileProblemRepository } from "@/src/filesystem/FileProblemRepository";
import type { ProblemDescription } from "@/types";

const DEFAULT_BASE_URL =
  process.env.OPENAI_BASE_URL || "http://127.0.0.1:1234/v1";
const API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL = getModelForRoute("ai/problem/generate-description");

interface RequestBody {
  problemId: string;
  title: string;
  difficulty: string;
  patterns: string[];
  companies: string[];
  url?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody;
    const streamMode = request.headers.get("x-stream") === "true";

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

    const prompt = buildGenerateDescriptionPrompt(body);

    // Streaming mode: stream raw tokens to client, then send final JSON event
    if (streamMode) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          let raw = "";
          try {
            for await (const chunk of client.generate(prompt)) {
              raw += chunk;
              // Send each chunk as a "token" event
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "token", content: chunk })}\n\n`),
              );
            }

            // Parse and persist
            const description = parseAndBuildDescription(raw, body);
            if (description) {
              const workspacePath = getWorkspacePath();
              const repo = new FileProblemRepository(workspacePath);
              await repo.saveDescription(body.problemId, description);
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "done", description })}\n\n`),
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

    const description = parseAndBuildDescription(raw, body);
    if (!description) {
      return NextResponse.json(
        { error: "AI returned invalid JSON. Please try again." },
        { status: 502 },
      );
    }

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

function parseAndBuildDescription(
  raw: string,
  body: RequestBody,
): ProblemDescription | null {
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
}
