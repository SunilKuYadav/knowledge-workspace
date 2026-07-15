/**
 * POST /api/ai/problem/generate-description
 *
 * Generates a full problem description with test cases from problem metadata,
 * persists it to description.json, and returns the result.
 *
 * Body: { problemId, title, difficulty, patterns[], companies[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { getReadyClient } from "@/ai";
import { buildGenerateDescriptionPrompt } from "@/ai/prompts";
import { getWorkspacePath } from "@/src/lib/constants";
import { FileProblemRepository } from "@/src/filesystem/FileProblemRepository";
import { validateTestCasesAgainstHarness, buildHarnessContextForPrompt } from "@/src/ai/harness-validator";
import type { ProblemDescription, SemanticDescription } from "@/types";

interface RequestBody {
  problemId: string;
  title: string;
  difficulty: string;
  patterns: string[];
  companies: string[];
  url?: string;
  semanticDescription?: SemanticDescription;
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

    const client = await getReadyClient("ai/problem/generate-description");

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
              // Validate and fix test cases against harness
              const fixedDescription = await fixTestCasesIfNeeded(description, client);
              const workspacePath = getWorkspacePath();
              const repo = new FileProblemRepository(workspacePath);
              await repo.saveDescription(body.problemId, fixedDescription);
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "done", description: fixedDescription })}\n\n`),
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

    // Validate and fix test cases against harness if needed
    const fixedDescription = await fixTestCasesIfNeeded(description, client);

    // Persist to disk
    const workspacePath = getWorkspacePath();
    const repo = new FileProblemRepository(workspacePath);
    await repo.saveDescription(body.problemId, fixedDescription);

    return NextResponse.json({ description: fixedDescription });
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
    harness: parsed.harness ? String(parsed.harness) : undefined,
    variations: [],
    linkedSimilar: [],
    generatedAt: now,
    updatedAt: now,
  };
}

/**
 * Validate test cases against the harness and, if there are mismatches,
 * ask the AI to fix them using the exact harness contract.
 *
 * This is the scalable solution: instead of adding prompt examples for every
 * data structure variant, we programmatically detect mismatches and do a
 * targeted fix-up pass with the harness contract injected.
 */
async function fixTestCasesIfNeeded(
  description: ProblemDescription,
  client: Awaited<ReturnType<typeof getReadyClient>>,
): Promise<ProblemDescription> {
  if (!description.harness) return description;

  const edgeCases = description.edgeCases || [];
  const allTestCases = [
    ...description.examples.map((e) => ({ input: e.input, expectedOutput: e.expectedOutput })),
    ...edgeCases.map((e) => ({ input: e.input, expectedOutput: e.expectedOutput })),
    ...description.testCases,
  ];

  const validation = validateTestCasesAgainstHarness(
    description.harness,
    allTestCases,
    "string",
  );

  if (validation.valid) return description;

  // Build a targeted fix-up prompt using the harness contract
  const harnessContext = buildHarnessContextForPrompt(description.harness);
  const issueDescriptions = validation.issues
    .map((issue) => `  - Test case ${issue.index}: "${issue.input}" → ${issue.message}`)
    .join("\n");

  const fixPrompt = `You are a senior software engineer. Fix test case inputs that are INCOMPATIBLE with the harness __deserialize function.

${harnessContext}

Problem: ${description.description.slice(0, 500)}
Boilerplate: ${description.boilerplate}

ISSUES DETECTED:
${issueDescriptions}

Current test data:
- examples: ${JSON.stringify(description.examples.map((e) => ({ input: e.input, expectedOutput: e.expectedOutput })))}
- edgeCases: ${JSON.stringify(edgeCases.map((e) => ({ input: e.input, expectedOutput: e.expectedOutput })))}
- testCases: ${JSON.stringify(description.testCases)}

Fix ONLY the inputs that are missing required parameters. Keep expectedOutput values correct.
The "input" string must include ALL parameters that __deserialize expects as named params.

Return ONLY a JSON object:
{
  "examples": [{ "input": "...", "expectedOutput": "...", "explanation": "..." }],
  "edgeCases": [{ "description": "...", "input": "...", "expectedOutput": "..." }],
  "testCases": [{ "input": "...", "expectedOutput": "..." }]
}`;

  try {
    let raw = "";
    for await (const chunk of client.generate(fixPrompt)) {
      raw += chunk;
    }

    let jsonStr = raw.trim();
    const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();
    const firstBrace = jsonStr.indexOf("{");
    const lastBrace = jsonStr.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    }

    const fixed = JSON.parse(jsonStr) as Record<string, unknown>;

    // Merge fixed data back
    if (Array.isArray(fixed.examples) && fixed.examples.length === description.examples.length) {
      description.examples = (fixed.examples as Array<Record<string, string>>).map((e) => ({
        input: String(e.input || ""),
        expectedOutput: String(e.expectedOutput || e.output || ""),
        explanation: String(e.explanation || ""),
      }));
    }
    if (Array.isArray(fixed.edgeCases) && fixed.edgeCases.length === edgeCases.length) {
      description.edgeCases = (fixed.edgeCases as Array<Record<string, string>>).map((ec) => ({
        description: String(ec.description || ""),
        input: String(ec.input || ""),
        expectedOutput: String(ec.expectedOutput || ""),
      }));
    }
    if (Array.isArray(fixed.testCases) && fixed.testCases.length >= description.testCases.length) {
      description.testCases = (fixed.testCases as Array<Record<string, string>>).map((tc) => ({
        input: String(tc.input || ""),
        expectedOutput: String(tc.expectedOutput || tc.output || ""),
      }));
    }
  } catch {
    // Fix-up failed; log and continue with original (imperfect) data
    console.warn("[generate-description] Harness fix-up pass failed, using original test cases");
  }

  return description;
}
