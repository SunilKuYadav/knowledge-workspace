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

import { NextRequest, NextResponse } from 'next/server';
import { createAIClient } from '@/ai';
import { AI_TIMEOUT } from '@/app/coding-interview/lib/constants';
import type {
  GeneratedProblem,
  TestCaseResult,
  EvaluationReport,
} from '@/app/coding-interview/lib/types';

const DEFAULT_BASE_URL = process.env.OPENAI_BASE_URL || 'http://127.0.0.1:1234/v1';
const API_KEY = process.env.OPENAI_API_KEY || '';
const MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

interface EvaluateRequestBody {
  code: string;
  language: 'javascript' | 'typescript';
  problem: GeneratedProblem;
  testResults: TestCaseResult[];
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as EvaluateRequestBody;
    const { code, language, problem, testResults } = body;

    if (!code || !language || !problem || !testResults) {
      return NextResponse.json(
        { error: 'Missing required fields: code, language, problem, testResults' },
        { status: 400 }
      );
    }

    const client = createAIClient({
      baseUrl: DEFAULT_BASE_URL,
      apiKey: API_KEY,
      defaultModel: MODEL,
    });

    const prompt = buildEvaluatePrompt(code, language, problem, testResults);

    // Use AbortController for 30s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT);

    try {
      let fullResponse = '';
      for await (const chunk of client.generate(prompt)) {
        if (controller.signal.aborted) break;
        fullResponse += chunk;
      }
      clearTimeout(timeoutId);

      if (controller.signal.aborted) {
        return NextResponse.json(
          { error: 'Evaluation timed out after 30 seconds' },
          { status: 504 }
        );
      }

      const evaluation = parseEvaluationResponse(fullResponse, testResults);
      return NextResponse.json({ evaluation });
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof Error && err.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Evaluation timed out after 30 seconds' },
          { status: 504 }
        );
      }

      return NextResponse.json(
        { error: 'Evaluation failed. Please retry or proceed to follow-up.' },
        { status: 500 }
      );
    }
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/* ─── Prompt Builder ─── */

function buildEvaluatePrompt(
  code: string,
  language: string,
  problem: GeneratedProblem,
  testResults: TestCaseResult[]
): string {
  const passedCount = testResults.filter((r) => r.passed).length;
  const totalCount = testResults.length;

  return `You are a senior software engineer conducting a coding interview evaluation.
Evaluate the following ${language} solution to the problem described below.

## Problem
Title: ${problem.title}
Difficulty: ${problem.difficulty}
Category: ${problem.category}

Statement:
${problem.statement}

Constraints:
${problem.constraints.join('\n')}

Expected Time Complexity: ${problem.expectedTimeComplexity}
Expected Space Complexity: ${problem.expectedSpaceComplexity}

## Submitted Code
\`\`\`${language}
${code}
\`\`\`

## Test Results
Passed: ${passedCount}/${totalCount}
${testResults
  .map(
    (r, i) =>
      `Test ${i + 1}: ${r.passed ? 'PASS' : 'FAIL'} | Input: ${JSON.stringify(r.input)} | Expected: ${JSON.stringify(r.expectedOutput)} | Got: ${JSON.stringify(r.actualOutput)} | Time: ${r.executionTimeMs}ms`
  )
  .join('\n')}

## Instructions
Provide a detailed evaluation as a JSON object with the following structure:
{
  "correctness": {
    "testsPassed": <number>,
    "testsTotal": <number>,
    "results": [] // leave empty, will be filled from actual test results
  },
  "algorithmChoice": {
    "submittedComplexity": "<Big-O of submitted solution>",
    "optimalComplexity": "${problem.expectedTimeComplexity}",
    "isOptimal": <boolean>,
    "feedback": "<1-3 sentences about the algorithm choice>"
  },
  "complexityAnalysis": {
    "timeComplexity": "<Big-O time>",
    "spaceComplexity": "<Big-O space>",
    "explanation": "<1-3 sentences explaining the complexity>"
  },
  "codeQuality": {
    "positives": ["<at least 1 specific positive observation>"],
    "improvements": ["<at least 1 specific improvement suggestion>"],
    "score": <0-100>
  },
  "edgeCaseHandling": {
    "handled": ["<edge cases the code handles>"],
    "missed": ["<edge cases from the problem that are not handled>"]
  },
  "errorHandling": {
    "assessment": "<1-3 sentences about error/robustness handling>",
    "suggestions": ["<specific improvement suggestions>"]
  }
}

Respond ONLY with valid JSON. No markdown, no explanation outside the JSON.`;
}

/* ─── Response Parser ─── */

function parseEvaluationResponse(
  response: string,
  testResults: TestCaseResult[]
): EvaluationReport {
  const defaultReport: EvaluationReport = {
    correctness: {
      testsPassed: testResults.filter((r) => r.passed).length,
      testsTotal: testResults.length,
      results: testResults,
    },
    algorithmChoice: {
      submittedComplexity: 'Unknown',
      optimalComplexity: 'Unknown',
      isOptimal: false,
      feedback: 'Unable to analyze algorithm choice.',
    },
    complexityAnalysis: {
      timeComplexity: 'Unknown',
      spaceComplexity: 'Unknown',
      explanation: 'Unable to analyze complexity.',
    },
    codeQuality: {
      positives: ['Code was submitted for evaluation.'],
      improvements: ['Consider reviewing the solution structure.'],
      score: 50,
    },
    edgeCaseHandling: {
      handled: [],
      missed: [],
    },
    errorHandling: {
      assessment: 'Unable to assess error handling.',
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
      submittedComplexity: String(parsed.algorithmChoice?.submittedComplexity || 'Unknown'),
      optimalComplexity: String(parsed.algorithmChoice?.optimalComplexity || 'Unknown'),
      isOptimal: Boolean(parsed.algorithmChoice?.isOptimal),
      feedback: String(parsed.algorithmChoice?.feedback || 'No feedback available.'),
    },
    complexityAnalysis: {
      timeComplexity: String(parsed.complexityAnalysis?.timeComplexity || 'Unknown'),
      spaceComplexity: String(parsed.complexityAnalysis?.spaceComplexity || 'Unknown'),
      explanation: String(parsed.complexityAnalysis?.explanation || 'No analysis available.'),
    },
    codeQuality: {
      positives: ensureNonEmptyStringArray(
        parsed.codeQuality?.positives,
        ['Code was submitted for evaluation.']
      ),
      improvements: ensureNonEmptyStringArray(
        parsed.codeQuality?.improvements,
        ['Consider reviewing the solution structure.']
      ),
      score: clampNumber(parsed.codeQuality?.score, 0, 100, 50),
    },
    edgeCaseHandling: {
      handled: toStringArray(parsed.edgeCaseHandling?.handled),
      missed: toStringArray(parsed.edgeCaseHandling?.missed),
    },
    errorHandling: {
      assessment: String(parsed.errorHandling?.assessment || 'No assessment available.'),
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
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch { /* fall through */ }

  // Try code block extraction
  const codeBlockMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1].trim());
      if (parsed && typeof parsed === 'object') return parsed;
    } catch { /* fall through */ }
  }

  // Try finding JSON object in response
  const firstBrace = response.indexOf('{');
  const lastBrace = response.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      const substr = response.slice(firstBrace, lastBrace + 1);
      const parsed = JSON.parse(substr);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch { /* fall through */ }
  }

  return null;
}

function ensureNonEmptyStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value) || value.length === 0) return fallback;
  return value.map(String);
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String);
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || isNaN(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}
