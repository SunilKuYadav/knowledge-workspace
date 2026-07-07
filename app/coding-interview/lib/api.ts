"use client";

import { AI_TIMEOUT } from "./constants";
import type {
  GeneratedProblem,
  InterviewSource,
  InterviewContext,
  EvaluationReport,
  ScoringReport,
  SessionSummary,
  ConversationMessage,
  ExecutionResult,
} from "./types";

/* ─── Request/Response Types ─────────────────────────────── */

export interface GenerateProblemParams {
  source: InterviewSource;
  context?: InterviewContext;
  language: "javascript" | "typescript";
  difficulty?: "easy" | "medium" | "hard";
  userPrompt?: string;
}

export interface RequestHintParams {
  problemStatement: string;
  code: string;
  level: number;
  previousHints?: string[];
}

export interface EvaluateCodeParams {
  code: string;
  problem: GeneratedProblem;
  language: "javascript" | "typescript";
  testResults?: ExecutionResult;
}

export interface RequestFollowUpParams {
  problem: GeneratedProblem;
  code: string;
  evaluation: EvaluationReport;
  conversationHistory: ConversationMessage[];
  userResponse?: string;
}

export interface RequestScoreParams {
  problem: GeneratedProblem;
  code: string;
  evaluation: EvaluationReport;
  conversationHistory: ConversationMessage[];
  hintsUsed: number;
  executionCount: number;
  elapsedSeconds: number;
  duration: number;
}

/* ─── Helper: Fetch with AbortController timeout ─────────── */

async function fetchWithTimeout(
  url: string,
  body: unknown,
  timeoutMs: number = AI_TIMEOUT,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return response;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `AI service request to ${url} timed out after ${timeoutMs / 1000} seconds. Please try again.`,
      );
    }
    throw new Error(
      `Network error while calling ${url}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

async function handleResponse<T>(
  response: Response,
  endpoint: string,
): Promise<T> {
  if (!response.ok) {
    let errorMessage: string;
    try {
      const errorBody = await response.json();
      errorMessage =
        errorBody.error ||
        errorBody.message ||
        `Request failed with status ${response.status}`;
    } catch {
      errorMessage = `Request to ${endpoint} failed with status ${response.status}`;
    }
    throw new Error(errorMessage);
  }
  return response.json() as Promise<T>;
}

/* ─── API Client Functions ───────────────────────────────── */

/**
 * Generate a coding interview problem based on configuration.
 * POST /api/ai/coding-interview/generate-problem
 */
export async function generateProblem(
  params: GenerateProblemParams,
): Promise<GeneratedProblem> {
  const endpoint = "/api/ai/coding-interview/generate-problem";
  const response = await fetchWithTimeout(endpoint, params);
  return handleResponse<GeneratedProblem>(response, endpoint);
}

/**
 * Request a progressive hint at the specified level.
 * POST /api/ai/coding-interview/hint
 */
export async function requestHint(
  params: RequestHintParams,
): Promise<{ hint: string; level: number }> {
  const endpoint = "/api/ai/coding-interview/hint";
  const response = await fetchWithTimeout(endpoint, params);
  return handleResponse<{ hint: string; level: number }>(response, endpoint);
}

/**
 * Evaluate submitted code with senior-engineer AI feedback.
 * POST /api/ai/coding-interview/evaluate
 */
export async function evaluateCode(
  params: EvaluateCodeParams,
): Promise<{ evaluation: EvaluationReport }> {
  const endpoint = "/api/ai/coding-interview/evaluate";
  const response = await fetchWithTimeout(endpoint, params);
  return handleResponse<{ evaluation: EvaluationReport }>(response, endpoint);
}

/**
 * Request a follow-up interview question or signal completion.
 * POST /api/ai/coding-interview/follow-up
 */
export async function requestFollowUp(
  params: RequestFollowUpParams,
): Promise<{ question?: string; complete: boolean }> {
  const endpoint = "/api/ai/coding-interview/follow-up";
  const response = await fetchWithTimeout(endpoint, params);
  return handleResponse<{ question?: string; complete: boolean }>(
    response,
    endpoint,
  );
}

/**
 * Request final scoring and session summary.
 * POST /api/ai/coding-interview/score
 */
export async function requestScore(
  params: RequestScoreParams,
): Promise<{ scoringReport: ScoringReport; sessionSummary: SessionSummary }> {
  const endpoint = "/api/ai/coding-interview/score";
  const response = await fetchWithTimeout(endpoint, params);
  return handleResponse<{
    scoringReport: ScoringReport;
    sessionSummary: SessionSummary;
  }>(response, endpoint);
}
