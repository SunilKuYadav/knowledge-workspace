/**
 * POST /api/ai/problem/generate-variation
 *
 * Generates a variation of an existing problem. Returns full problem
 * definition that can be saved and practiced independently.
 * Max 3 variations per problem. Supports "upgrade" mode to replace an existing variation.
 *
 * Body: { problemId, title, description, difficulty, patterns[], upgradeVariationId? }
 * Returns: { variation: ProblemVariation }
 */

import { NextRequest, NextResponse } from "next/server";
import { getReadyClient } from "@/ai";
import { buildGenerateVariationPrompt } from "@/ai/prompts";
import { getWorkspacePath } from "@/src/lib/constants";
import { FileProblemRepository } from "@/src/filesystem/FileProblemRepository";
import type { ProblemDescription, ProblemVariation, SemanticDescription } from "@/types";
import { v4 as uuid } from "uuid";

const MAX_VARIATIONS = 3;

interface RequestBody {
  problemId: string;
  title: string;
  description: string;
  difficulty: string;
  patterns: string[];
  semanticDescription?: SemanticDescription;
  /** If set, replaces this variation (upgrade mode) */
  upgradeVariationId?: string;
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

    const workspacePath = getWorkspacePath();
    const repo = new FileProblemRepository(workspacePath);
    const existing = await repo.getDescription(body.problemId);

    const currentVariations = existing?.variations || [];

    // Enforce max 3 variations (unless upgrading an existing one)
    if (!body.upgradeVariationId && currentVariations.length >= MAX_VARIATIONS) {
      return NextResponse.json(
        { error: `Maximum of ${MAX_VARIATIONS} variations reached. Use upgrade to improve an existing variation.` },
        { status: 400 },
      );
    }

    // Build existing variations context for the prompt
    const existingForPrompt = currentVariations.map((v) => ({
      title: v.title,
      description: v.description,
      difficulty: v.difficulty,
    }));

    // If upgrading, find the target variation
    let upgradeTarget: { title: string; description: string; difficulty: string } | undefined;
    if (body.upgradeVariationId) {
      const target = currentVariations.find((v) => v.id === body.upgradeVariationId);
      if (!target) {
        return NextResponse.json(
          { error: "Variation to upgrade not found" },
          { status: 404 },
        );
      }
      upgradeTarget = {
        title: target.title,
        description: target.description,
        difficulty: target.difficulty,
      };
    }

    const client = await getReadyClient("ai/problem/generate-variation");

    const available = await client.isAvailable();
    if (!available) {
      return NextResponse.json(
        { error: "AI service is currently unavailable" },
        { status: 503 },
      );
    }

    const prompt = buildGenerateVariationPrompt({
      ...body,
      existingVariations: existingForPrompt,
      upgradeTarget,
    });

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
              // Persist — either replace (upgrade) or append
              const freshDesc = await repo.getDescription(body.problemId);
              if (freshDesc) {
                let updatedVariations: ProblemVariation[];
                if (body.upgradeVariationId) {
                  // Replace the target variation, clear its practice data
                  updatedVariations = freshDesc.variations?.map((v) =>
                    v.id === body.upgradeVariationId ? variation : v,
                  ) || [variation];
                } else {
                  updatedVariations = [...(freshDesc.variations || []), variation];
                }
                const updatedDescription: ProblemDescription = {
                  ...freshDesc,
                  variations: updatedVariations,
                  updatedAt: new Date().toISOString(),
                };
                await repo.saveDescription(body.problemId, updatedDescription);
              }
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "done", variation, upgradedId: body.upgradeVariationId || null })}\n\n`),
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

    // Non-streaming mode
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

    // Persist
    if (existing) {
      let updatedVariations: ProblemVariation[];
      if (body.upgradeVariationId) {
        updatedVariations = existing.variations?.map((v) =>
          v.id === body.upgradeVariationId ? variation : v,
        ) || [variation];
      } else {
        updatedVariations = [...(existing.variations || []), variation];
      }
      const updatedDescription: ProblemDescription = {
        ...existing,
        variations: updatedVariations,
        updatedAt: new Date().toISOString(),
      };
      await repo.saveDescription(body.problemId, updatedDescription);
    }

    return NextResponse.json({ variation, upgradedId: body.upgradeVariationId || null });
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
