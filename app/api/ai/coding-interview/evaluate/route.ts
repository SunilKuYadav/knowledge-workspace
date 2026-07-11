/**
 * API route for AI-powered code evaluation.
 *
 * Accepts submitted code, language, problem definition, and test results,
 * then returns a structured EvaluationReport with senior-engineer feedback
 * across 6 dimensions: correctness, algorithm choice, complexity analysis,
 * code quality, edge case handling, and error handling.
 *
 * Requirements: 6 (AC 1-9)
 */

import { NextRequest, NextResponse } from "next/server";
import { getReadyClient } from "@/ai";
import { AI_TIMEOUT } from "@/app/coding-interview/lib/constants";
import { buildEvaluatePrompt } from "@/ai/prompts";
import type {
  GeneratedProblem,
  TestCaseResult,
  EvaluationReport,
} from "@/app/coding-interview/lib/types";

interface EvaluateRequestBody {
  code: string;
  language: "javascript" | "typescript";
  problem: GeneratedProblem;
  testResults: TestCaseResult[] | {
    testResults: TestCaseResult[];
    consoleOutput?: string;
    executionTimeMs?: number;
    memoryUsageMb?: number;
    error?: unknown;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as EvaluateRequestBody;
    const { code, language, problem } = body;

    // The client sends an ExecutionResult object; extract the testResults array
    const testResults: TestCaseResult[] = Array.isArray(body.testResults)
      ? body.testResults
      : Array.isArray((body.testResults as { testResults?: unknown })?.testResults)
        ? (body.testResults as { testResults: TestCaseResult[] }).testResults
        : [];

    if (!code || !language || !problem || testResults.length === 0) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: code, language, problem, testResults",
        },
        { status: 400 },
      );
    }

    const client = await getReadyClient("ai/coding-interview/evaluate");

    const prompt = buildEvaluatePrompt(code, language, problem, testResults);

    // Use AbortController for 30s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT);

    try {
      let fullResponse = "";
      for await (const chunk of client.generate(prompt)) {
        if (controller.signal.aborted) break;
        fullResponse += chunk;
      }
      clearTimeout(timeoutId);

      if (controller.signal.aborted) {
        return NextResponse.json(
          { error: "Evaluation timed out after 30 seconds" },
          { status: 504 },
        );
      }

      const evaluation = parseEvaluationResponse(fullResponse, testResults);
      return NextResponse.json({ evaluation });
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof Error && err.name === "AbortError") {
        return NextResponse.json(
          { error: "Evaluation timed out after 30 seconds" },
          { status: 504 },
        );
      }

      return NextResponse.json(
        { error: "Evaluation failed. Please retry or proceed to follow-up." },
        { status: 500 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/* ─── Response Parser ─── */

function parseEvaluationResponse(
  response: string,
  testResults: TestCaseResult[],
): EvaluationReport {
  const defaultReport: EvaluationReport = {
    correctness: {
      testsPassed: testResults.filter((r) => r.passed).length,
      testsTotal: testResults.length,
      results: testResults,
    },
    algorithmChoice: {
      submittedComplexity: "Unknown",
      optimalComplexity: "Unknown",
      isOptimal: false,
      feedback: "Unable to analyze algorithm choice.",
    },
    complexityAnalysis: {
      timeComplexity: "Unknown",
      spaceComplexity: "Unknown",
      explanation: "Unable to analyze complexity.",
    },
    codeQuality: {
      positives: ["Code was submitted for evaluation."],
      improvements: ["Consider reviewing the solution structure."],
      score: 50,
    },
    edgeCaseHandling: {
      handled: [],
      missed: [],
    },
    errorHandling: {
      assessment: "Unable to assess error handling.",
      suggestions: [],
    },
  };

  const parsed = extractJsonObject(response);
  if (!parsed) return defaultReport;

  return {
    correctness: {
      testsPassed: testResults.filter((r) => r.passed).length,
      testsTotal: testResults.length,
      results: testResults,
    },
    algorithmChoice: {
      submittedComplexity: String(
        parsed.algorithmChoice?.submittedComplexity || "Unknown",
      ),
      optimalComplexity: String(
        parsed.algorithmChoice?.optimalComplexity || "Unknown",
      ),
      isOptimal: Boolean(parsed.algorithmChoice?.isOptimal),
      feedback: String(
        parsed.algorithmChoice?.feedback || "No feedback available.",
      ),
    },
    complexityAnalysis: {
      timeComplexity: String(
        parsed.complexityAnalysis?.timeComplexity || "Unknown",
      ),
      spaceComplexity: String(
        parsed.complexityAnalysis?.spaceComplexity || "Unknown",
      ),
      explanation: String(
        parsed.complexityAnalysis?.explanation || "No analysis available.",
      ),
    },
    codeQuality: {
      positives: ensureNonEmptyStringArray(parsed.codeQuality?.positives, [
        "Code was submitted for evaluation.",
      ]),
      improvements: ensureNonEmptyStringArray(
        parsed.codeQuality?.improvements,
        ["Consider reviewing the solution structure."],
      ),
      score: clampNumber(parsed.codeQuality?.score, 0, 100, 50),
    },
    edgeCaseHandling: {
      handled: toStringArray(parsed.edgeCaseHandling?.handled),
      missed: toStringArray(parsed.edgeCaseHandling?.missed),
    },
    errorHandling: {
      assessment: String(
        parsed.errorHandling?.assessment || "No assessment available.",
      ),
      suggestions: toStringArray(parsed.errorHandling?.suggestions),
    },
  };
}

/* ─── Utility Helpers ─── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractJsonObject(response: string): any | null {
  // Try direct parse
  try {
    const trimmed = response.trim();
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed))
      return parsed;
  } catch {
    /* fall through */
  }

  // Try code block extraction
  const codeBlockMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1].trim());
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      /* fall through */
    }
  }

  // Try finding JSON object in response
  const firstBrace = response.indexOf("{");
  const lastBrace = response.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      const substr = response.slice(firstBrace, lastBrace + 1);
      const parsed = JSON.parse(substr);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {
      /* fall through */
    }
  }

  return null;
}

function ensureNonEmptyStringArray(
  value: unknown,
  fallback: string[],
): string[] {
  if (!Array.isArray(value) || value.length === 0) return fallback;
  return value.map(String);
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String);
}

function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  if (typeof value !== "number" || isNaN(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}
