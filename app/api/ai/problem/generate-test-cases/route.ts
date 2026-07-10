/**
 * POST /api/ai/problem/generate-test-cases
 *
 * Generates a comprehensive test suite for a problem or variation.
 * Returns categorized test cases covering all possible scenarios.
 * Supports streaming and non-streaming modes.
 *
 * Body: { problemId, targetId, title, description, difficulty, patterns[], constraints[], inputFormat?, outputFormat?, boilerplate?, existingTestCases? }
 * Returns: { testSuite: GeneratedTestSuite }
 */

import { NextRequest, NextResponse } from "next/server";
import { getReadyClient } from "@/ai";
import { buildGenerateTestCasesPrompt } from "@/ai/prompts";
import { getWorkspacePath } from "@/src/lib/constants";
import { FileProblemRepository } from "@/src/filesystem/FileProblemRepository";
import type { ProblemDescription, GeneratedTestSuite, SemanticDescription } from "@/types";
import { v4 as uuid } from "uuid";

interface RequestBody {
  problemId: string;
  /** "main" or a variation ID */
  targetId: string;
  title: string;
  description: string;
  difficulty: string;
  patterns: string[];
  constraints: string[];
  inputFormat?: string;
  outputFormat?: string;
  boilerplate?: string;
  existingTestCases?: { input: string; expectedOutput: string }[];
  semanticDescription?: SemanticDescription;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody;
    const streamMode = request.headers.get("x-stream") === "true";

    if (!body.problemId || !body.title || !body.description) {
      return NextResponse.json(
        { error: "Missing required fields: problemId, title, description" },
        { status: 400 },
      );
    }

    const client = await getReadyClient("ai/problem/generate-test-cases");
    const available = await client.isAvailable();
    if (!available) {
      return NextResponse.json(
        { error: "AI service is currently unavailable" },
        { status: 503 },
      );
    }

    const prompt = buildGenerateTestCasesPrompt({
      title: body.title,
      description: body.description,
      difficulty: body.difficulty,
      patterns: body.patterns,
      constraints: body.constraints,
      inputFormat: body.inputFormat,
      outputFormat: body.outputFormat,
      boilerplate: body.boilerplate,
      existingTestCases: body.existingTestCases,
      semanticDescription: body.semanticDescription,
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
                encoder.encode(
                  `data: ${JSON.stringify({ type: "token", content: chunk })}\n\n`,
                ),
              );
            }

            const testSuite = parseAndBuildTestSuite(raw, body.targetId);
            if (testSuite) {
              // Persist
              const workspacePath = getWorkspacePath();
              const repo = new FileProblemRepository(workspacePath);
              await persistTestSuite(repo, body.problemId, testSuite);
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "done", testSuite })}\n\n`,
                ),
              );
            } else {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "error", error: "AI returned invalid JSON. Please try again." })}\n\n`,
                ),
              );
            }
          } catch {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "error", error: "Generation failed" })}\n\n`,
              ),
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

    const testSuite = parseAndBuildTestSuite(raw, body.targetId);
    if (!testSuite) {
      return NextResponse.json(
        { error: "AI returned invalid JSON. Please try again." },
        { status: 502 },
      );
    }

    // Persist
    const workspacePath = getWorkspacePath();
    const repo = new FileProblemRepository(workspacePath);
    await persistTestSuite(repo, body.problemId, testSuite);

    return NextResponse.json({ testSuite });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/ai/problem/generate-test-cases
 *
 * Deletes a generated test suite for a problem target.
 * Body: { problemId, targetId }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json()) as { problemId: string; targetId: string };

    if (!body.problemId || !body.targetId) {
      return NextResponse.json(
        { error: "Missing required fields: problemId, targetId" },
        { status: 400 },
      );
    }

    const workspacePath = getWorkspacePath();
    const repo = new FileProblemRepository(workspacePath);
    const desc = await repo.getDescription(body.problemId);
    if (!desc) {
      return NextResponse.json({ error: "Description not found" }, { status: 404 });
    }

    const suites = desc.generatedTestSuites || [];
    const filtered = suites.filter((s) => s.targetId !== body.targetId);

    const updated: ProblemDescription = {
      ...desc,
      generatedTestSuites: filtered,
      updatedAt: new Date().toISOString(),
    };
    await repo.saveDescription(body.problemId, updated);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

async function persistTestSuite(
  repo: FileProblemRepository,
  problemId: string,
  testSuite: GeneratedTestSuite,
): Promise<void> {
  const desc = await repo.getDescription(problemId);
  if (!desc) return;

  const suites = desc.generatedTestSuites || [];
  // Replace existing suite for same target, or add new
  const existingIdx = suites.findIndex((s) => s.targetId === testSuite.targetId);
  if (existingIdx >= 0) {
    suites[existingIdx] = testSuite;
  } else {
    suites.push(testSuite);
  }

  const updated: ProblemDescription = {
    ...desc,
    generatedTestSuites: suites,
    updatedAt: new Date().toISOString(),
  };
  await repo.saveDescription(problemId, updated);
}

function parseAndBuildTestSuite(
  raw: string,
  targetId: string,
): GeneratedTestSuite | null {
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

  if (!Array.isArray(parsed.categories) || parsed.categories.length === 0) {
    return null;
  }

  const categories = (parsed.categories as Array<Record<string, unknown>>).map(
    (cat) => ({
      name: String(cat.name || "Unnamed"),
      description: String(cat.description || ""),
      testCases: Array.isArray(cat.testCases)
        ? (cat.testCases as Array<Record<string, string>>).map((tc) => ({
            input: String(tc.input || ""),
            expectedOutput: String(tc.expectedOutput || tc.output || ""),
            explanation: tc.explanation ? String(tc.explanation) : undefined,
          }))
        : [],
    }),
  );

  const totalCount = categories.reduce(
    (sum, cat) => sum + cat.testCases.length,
    0,
  );

  return {
    id: uuid(),
    targetId,
    categories,
    totalCount,
    generatedAt: new Date().toISOString(),
  };
}
