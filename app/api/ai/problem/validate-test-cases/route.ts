/**
 * POST /api/ai/problem/validate-test-cases
 *
 * Validates test cases against the problem description using AI.
 * If invalid test cases are found, regenerates correct expected outputs.
 *
 * Body: { problemId, title, description, constraints, inputFormat, outputFormat, boilerplate, testCases }
 * Returns: { results: { index, input, expectedOutput, isValid, correctedOutput?, reason? }[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { getReadyClient } from "@/ai";
import { getWorkspacePath } from "@/src/lib/constants";
import { FileProblemRepository } from "@/src/filesystem/FileProblemRepository";
import { buildProblemTestValidationPrompt } from "@/ai/prompts/builders/test-validation";
import type { ProblemDescription } from "@/types";

interface TestCaseEntry {
  input: string;
  expectedOutput: string;
}

interface RequestBody {
  problemId: string;
  title: string;
  description: string;
  constraints: string[];
  inputFormat?: string;
  outputFormat?: string;
  boilerplate?: string;
  testCases: TestCaseEntry[];
  /** If validating a variation's test cases */
  variationId?: string;
}

interface ValidationResult {
  index: number;
  input: string;
  expectedOutput: string;
  isValid: boolean;
  correctedOutput?: string;
  reason?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody;

    if (!body.problemId || !body.title || !body.testCases?.length) {
      return NextResponse.json(
        { error: "Missing required fields: problemId, title, testCases" },
        { status: 400 },
      );
    }

    const client = await getReadyClient("ai/problem/validate-test-cases");
    const available = await client.isAvailable();
    if (!available) {
      return NextResponse.json(
        { error: "AI service is currently unavailable" },
        { status: 503 },
      );
    }

    const prompt = buildProblemTestValidationPrompt(body);

    let raw = "";
    for await (const chunk of client.generate(prompt)) {
      raw += chunk;
    }

    // Parse the JSON response
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "AI returned invalid response format" },
        { status: 502 },
      );
    }

    let results: ValidationResult[];
    try {
      results = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI validation response" },
        { status: 502 },
      );
    }

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/ai/problem/validate-test-cases
 *
 * Applies corrections to test cases in description.json.
 * Body: { problemId, variationId?, corrections: { index, correctedOutput }[] }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      problemId: string;
      variationId?: string;
      corrections: { index: number; correctedOutput: string }[];
    };

    if (!body.problemId || !body.corrections?.length) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const workspacePath = getWorkspacePath();
    const repo = new FileProblemRepository(workspacePath);
    const desc = await repo.getDescription(body.problemId);

    if (!desc) {
      return NextResponse.json(
        { error: "Description not found" },
        { status: 404 },
      );
    }

    let updated: ProblemDescription;

    if (body.variationId) {
      // Update variation test cases
      const variations = desc.variations || [];
      const vIdx = variations.findIndex((v) => v.id === body.variationId);
      if (vIdx < 0) {
        return NextResponse.json(
          { error: "Variation not found" },
          { status: 404 },
        );
      }

      const variation = { ...variations[vIdx] };
      const samples = [...(variation.samples || [])];
      const testCases = [...variation.testCases];
      const samplesLen = samples.length;

      for (const correction of body.corrections) {
        if (correction.index < samplesLen) {
          samples[correction.index] = {
            ...samples[correction.index],
            output: correction.correctedOutput,
          };
        } else {
          const tcIdx = correction.index - samplesLen;
          if (tcIdx < testCases.length) {
            testCases[tcIdx] = {
              ...testCases[tcIdx],
              expectedOutput: correction.correctedOutput,
            };
          }
        }
      }

      variation.samples = samples;
      variation.testCases = testCases;
      const updatedVariations = [...variations];
      updatedVariations[vIdx] = variation;

      updated = {
        ...desc,
        variations: updatedVariations,
        updatedAt: new Date().toISOString(),
      };
    } else {
      // Update main test cases
      const examples = [...desc.examples];
      const testCases = [...desc.testCases];
      const examplesLen = examples.length;

      for (const correction of body.corrections) {
        if (correction.index < examplesLen) {
          examples[correction.index] = {
            ...examples[correction.index],
            expectedOutput: correction.correctedOutput,
          };
        } else {
          const tcIdx = correction.index - examplesLen;
          if (tcIdx < testCases.length) {
            testCases[tcIdx] = {
              ...testCases[tcIdx],
              expectedOutput: correction.correctedOutput,
            };
          }
        }
      }

      updated = {
        ...desc,
        examples,
        testCases,
        updatedAt: new Date().toISOString(),
      };
    }

    await repo.saveDescription(body.problemId, updated);

    return NextResponse.json({ success: true, description: updated });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
