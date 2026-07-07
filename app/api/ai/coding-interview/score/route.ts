/**
 * API route for scoring and session summary generation.
 *
 * Accepts evaluation data, conversation history, and session metrics,
 * then uses pure scoring functions for readiness/penalties and AI for
 * dimension scores and session summary.
 *
 * Returns: { scoringReport: ScoringReport, sessionSummary: SessionSummary }
 *
 * Requirements: 10 (AC 1-8), 11 (AC 1-9)
 */

import { NextRequest, NextResponse } from "next/server";
import { createAIClient } from "@/ai";
import { AI_TIMEOUT } from "@/app/coding-interview/lib/constants";
import {
  getReadiness,
  calculatePenalty,
  applyPenalties,
  clampScore,
} from "@/app/coding-interview/lib/scoring";
import type {
  EvaluationReport,
  ConversationMessage,
  ScoringReport,
  SessionSummary,
  DimensionScore,
} from "@/app/coding-interview/lib/types";

const DEFAULT_BASE_URL =
  process.env.OPENAI_BASE_URL || "http://127.0.0.1:1234/v1";
const API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL = process.env.OPENAI_MODEL || "gpt-3.5-turbo";

interface ScoreRequestBody {
  evaluation: EvaluationReport;
  conversationHistory: ConversationMessage[];
  hintsUsed: number;
  executionCount: number;
  elapsedSeconds: number;
  duration: number; // minutes
  code: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ScoreRequestBody;
    const {
      evaluation,
      conversationHistory,
      hintsUsed,
      executionCount,
      elapsedSeconds,
      duration,
      code,
    } = body;

    if (!evaluation || !code) {
      return NextResponse.json(
        { error: "Missing required fields: evaluation, code" },
        { status: 400 },
      );
    }

    const client = createAIClient({
      baseUrl: DEFAULT_BASE_URL,
      apiKey: API_KEY,
      defaultModel: MODEL,
    });

    // Calculate penalties using pure functions
    const penalties = calculatePenalty(
      hintsUsed || 0,
      executionCount || 0,
      elapsedSeconds || 0,
      duration || 45,
    );

    const prompt = buildScorePrompt(
      evaluation,
      conversationHistory || [],
      code,
      hintsUsed || 0,
      executionCount || 0,
      elapsedSeconds || 0,
      duration || 45,
    );

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
          { error: "Scoring timed out after 30 seconds" },
          { status: 504 },
        );
      }

      const parsed = parseScoreResponse(fullResponse);

      // Apply penalties to the AI-generated base score
      const baseScore = parsed.overallScore;
      const finalScore = applyPenalties(baseScore, penalties);
      const readiness = getReadiness(finalScore);

      // Build the final scoring report
      const scoringReport: ScoringReport = {
        overallScore: finalScore,
        dimensions: parsed.dimensions,
        confidence: parsed.confidence,
        readiness,
        penalties,
      };

      const sessionSummary = parsed.sessionSummary;

      return NextResponse.json({ scoringReport, sessionSummary });
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof Error && err.name === "AbortError") {
        return NextResponse.json(
          { error: "Scoring timed out after 30 seconds" },
          { status: 504 },
        );
      }

      return NextResponse.json(
        { error: "Scoring failed. Please retry." },
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

/* ─── Prompt Builder ─── */

function buildScorePrompt(
  evaluation: EvaluationReport,
  conversationHistory: ConversationMessage[],
  code: string,
  hintsUsed: number,
  executionCount: number,
  elapsedSeconds: number,
  duration: number,
): string {
  const conversationSummary =
    conversationHistory.length > 0
      ? conversationHistory.map((m) => `${m.role}: ${m.content}`).join("\n")
      : "No follow-up discussion took place.";

  return `You are a senior software engineer scoring a coding interview session.
Based on the evaluation data and follow-up discussion below, provide dimension scores and a session summary.

## Evaluation Results
- Correctness: ${evaluation.correctness.testsPassed}/${evaluation.correctness.testsTotal} tests passed
- Algorithm: ${evaluation.algorithmChoice.feedback}
- Is Optimal: ${evaluation.algorithmChoice.isOptimal}
- Time Complexity: ${evaluation.complexityAnalysis.timeComplexity}
- Space Complexity: ${evaluation.complexityAnalysis.spaceComplexity}
- Code Quality Score: ${evaluation.codeQuality.score}/100
- Positives: ${evaluation.codeQuality.positives.join("; ")}
- Improvements: ${evaluation.codeQuality.improvements.join("; ")}
- Edge Cases Handled: ${evaluation.edgeCaseHandling.handled.join("; ") || "None identified"}
- Edge Cases Missed: ${evaluation.edgeCaseHandling.missed.join("; ") || "None identified"}
- Error Handling: ${evaluation.errorHandling.assessment}

## Session Metrics
- Hints Used: ${hintsUsed}
- Execution Attempts: ${executionCount}
- Time Elapsed: ${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s / ${duration}m allowed

## Submitted Code
\`\`\`
${code.slice(0, 2000)}
\`\`\`

## Follow-Up Discussion
${conversationSummary.slice(0, 3000)}

## Instructions
Respond with a JSON object containing two keys: "scoring" and "sessionSummary".

"scoring" must have:
{
  "overallScore": <0-100 integer>,
  "dimensions": {
    "communication": { "score": <0-100>, "justification": "<1-3 sentences>" },
    "codingAbility": { "score": <0-100>, "justification": "<1-3 sentences>" },
    "problemSolving": { "score": <0-100>, "justification": "<1-3 sentences>" },
    "algorithmSelection": { "score": <0-100>, "justification": "<1-3 sentences>" },
    "complexityAnalysis": { "score": <0-100>, "justification": "<1-3 sentences>" },
    "edgeCaseCoverage": { "score": <0-100>, "justification": "<1-3 sentences>" },
    "codeQuality": { "score": <0-100>, "justification": "<1-3 sentences>" }
  },
  "confidence": <0-100 integer>
}

"sessionSummary" must have:
{
  "strengths": ["<1-5 items>"],
  "weaknesses": ["<1-5 items>"],
  "missedEdgeCases": [{ "case": "<description>", "explanation": "<why it matters>" }],
  "alternativeSolutions": [{ "approach": "<name>", "timeComplexity": "<Big-O>", "spaceComplexity": "<Big-O>" }], // 1-3 items
  "studyRecommendations": ["<2-5 items>"],
  "similarProblems": [{ "title": "<problem title>", "targetSkill": "<skill>" }], // 2-5 items
  "nextTopics": ["<1-3 items>"],
  "improvementPlan": [{ "action": "<action>", "priority": "high|medium|low" }] // 3-7 items, ordered high→low
}

Respond ONLY with valid JSON. No markdown, no explanation outside the JSON.`;
}

/* ─── Response Parser ─── */

interface ParsedScoreResponse {
  overallScore: number;
  dimensions: ScoringReport["dimensions"];
  confidence: number;
  sessionSummary: SessionSummary;
}

function parseScoreResponse(response: string): ParsedScoreResponse {
  const parsed = extractJsonObject(response);

  const scoring = parsed?.scoring || parsed;
  const summary = parsed?.sessionSummary || parsed?.session_summary;

  return {
    overallScore: clampScore(scoring?.overallScore ?? 50),
    dimensions: parseDimensions(scoring?.dimensions),
    confidence: clampScore(scoring?.confidence ?? 50),
    sessionSummary: parseSessionSummary(summary),
  };
}

function parseDimensions(
  dims: Record<string, unknown> | undefined,
): ScoringReport["dimensions"] {
  const defaultDimension: DimensionScore = {
    score: 50,
    justification: "Insufficient data for assessment.",
  };

  if (!dims || typeof dims !== "object") {
    return {
      communication: defaultDimension,
      codingAbility: defaultDimension,
      problemSolving: defaultDimension,
      algorithmSelection: defaultDimension,
      complexityAnalysis: defaultDimension,
      edgeCaseCoverage: defaultDimension,
      codeQuality: defaultDimension,
    };
  }

  return {
    communication: parseDimension(dims.communication),
    codingAbility: parseDimension(dims.codingAbility),
    problemSolving: parseDimension(dims.problemSolving),
    algorithmSelection: parseDimension(dims.algorithmSelection),
    complexityAnalysis: parseDimension(dims.complexityAnalysis),
    edgeCaseCoverage: parseDimension(dims.edgeCaseCoverage),
    codeQuality: parseDimension(dims.codeQuality),
  };
}

function parseDimension(dim: unknown): DimensionScore {
  if (!dim || typeof dim !== "object") {
    return { score: 50, justification: "Insufficient data for assessment." };
  }
  const d = dim as Record<string, unknown>;
  return {
    score: clampScore(typeof d.score === "number" ? d.score : 50),
    justification:
      typeof d.justification === "string" && d.justification.length > 0
        ? d.justification
        : "Insufficient data for assessment.",
  };
}

function parseSessionSummary(summary: unknown): SessionSummary {
  const defaultSummary: SessionSummary = {
    strengths: ["Completed the coding interview session."],
    weaknesses: ["Areas for improvement were identified."],
    missedEdgeCases: [],
    alternativeSolutions: [
      {
        approach: "Brute force",
        timeComplexity: "O(n²)",
        spaceComplexity: "O(1)",
      },
    ],
    studyRecommendations: [
      "Review algorithm fundamentals.",
      "Practice edge case identification.",
    ],
    similarProblems: [
      { title: "Two Sum", targetSkill: "Hash map usage" },
      { title: "Valid Parentheses", targetSkill: "Stack data structure" },
    ],
    nextTopics: ["Data structures fundamentals"],
    improvementPlan: [
      { action: "Practice timed coding sessions", priority: "high" },
      { action: "Study common algorithm patterns", priority: "medium" },
      { action: "Review edge case identification techniques", priority: "low" },
    ],
  };

  if (!summary || typeof summary !== "object") return defaultSummary;
  const s = summary as Record<string, unknown>;

  return {
    strengths: clampArray(
      toStringArray(s.strengths),
      1,
      5,
      defaultSummary.strengths,
    ),
    weaknesses: clampArray(
      toStringArray(s.weaknesses),
      1,
      5,
      defaultSummary.weaknesses,
    ),
    missedEdgeCases: parseMissedEdgeCases(s.missedEdgeCases),
    alternativeSolutions: parseAlternativeSolutions(s.alternativeSolutions),
    studyRecommendations: clampArray(
      toStringArray(s.studyRecommendations),
      2,
      5,
      defaultSummary.studyRecommendations,
    ),
    similarProblems: parseSimilarProblems(s.similarProblems),
    nextTopics: clampArray(
      toStringArray(s.nextTopics),
      1,
      3,
      defaultSummary.nextTopics,
    ),
    improvementPlan: parseImprovementPlan(s.improvementPlan),
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

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v) => typeof v === "string" && v.length > 0).map(String);
}

function clampArray(
  arr: string[],
  min: number,
  max: number,
  fallback: string[],
): string[] {
  if (arr.length < min) return fallback.slice(0, max);
  return arr.slice(0, max);
}

function parseMissedEdgeCases(
  value: unknown,
): Array<{ case: string; explanation: string }> {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Record<string, unknown> => !!v && typeof v === "object")
    .map((v) => ({
      case: String(v.case || v.description || ""),
      explanation: String(v.explanation || ""),
    }))
    .filter((v) => v.case.length > 0);
}

function parseAlternativeSolutions(
  value: unknown,
): Array<{
  approach: string;
  timeComplexity: string;
  spaceComplexity: string;
}> {
  const fallback = [
    {
      approach: "Brute force",
      timeComplexity: "O(n²)",
      spaceComplexity: "O(1)",
    },
  ];
  if (!Array.isArray(value)) return fallback;

  const parsed = value
    .filter((v): v is Record<string, unknown> => !!v && typeof v === "object")
    .map((v) => ({
      approach: String(v.approach || ""),
      timeComplexity: String(
        v.timeComplexity || v.time_complexity || "Unknown",
      ),
      spaceComplexity: String(
        v.spaceComplexity || v.space_complexity || "Unknown",
      ),
    }))
    .filter((v) => v.approach.length > 0);

  if (parsed.length < 1) return fallback;
  return parsed.slice(0, 3);
}

function parseSimilarProblems(
  value: unknown,
): Array<{ title: string; targetSkill: string }> {
  const fallback = [
    { title: "Two Sum", targetSkill: "Hash map usage" },
    { title: "Valid Parentheses", targetSkill: "Stack data structure" },
  ];
  if (!Array.isArray(value)) return fallback;

  const parsed = value
    .filter((v): v is Record<string, unknown> => !!v && typeof v === "object")
    .map((v) => ({
      title: String(v.title || ""),
      targetSkill: String(v.targetSkill || v.target_skill || ""),
    }))
    .filter((v) => v.title.length > 0 && v.targetSkill.length > 0);

  if (parsed.length < 2) return fallback;
  return parsed.slice(0, 5);
}

function parseImprovementPlan(
  value: unknown,
): Array<{ action: string; priority: "high" | "medium" | "low" }> {
  const fallback: Array<{
    action: string;
    priority: "high" | "medium" | "low";
  }> = [
    { action: "Practice timed coding sessions", priority: "high" },
    { action: "Study common algorithm patterns", priority: "medium" },
    { action: "Review edge case identification techniques", priority: "low" },
  ];
  if (!Array.isArray(value)) return fallback;

  const validPriorities = new Set(["high", "medium", "low"]);
  const parsed = value
    .filter((v): v is Record<string, unknown> => !!v && typeof v === "object")
    .map((v) => ({
      action: String(v.action || ""),
      priority: (validPriorities.has(String(v.priority))
        ? String(v.priority)
        : "medium") as "high" | "medium" | "low",
    }))
    .filter((v) => v.action.length > 0);

  if (parsed.length < 3) return fallback;

  // Sort by priority: high → medium → low
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sorted = parsed
    .slice(0, 7)
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  return sorted;
}
