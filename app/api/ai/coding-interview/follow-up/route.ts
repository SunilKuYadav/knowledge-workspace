/**
 * API route for adaptive follow-up interview questions.
 *
 * POST handler accepts { code, evaluation, conversationHistory, problem, userResponse }
 * and returns contextual follow-up questions that adapt based on conversation history.
 *
 * Behavior:
 * - If conversationHistory is empty, generates the opening question
 * - If conversationHistory has 8+ interviewer messages, returns { complete: true }
 * - Otherwise, analyzes the user's latest response and generates a follow-up
 *
 * Topic areas explored:
 * - Alternative approaches
 * - Time/space trade-offs
 * - Behavior with large inputs
 * - Memory considerations
 * - Iterative vs recursive solutions
 * - Production considerations
 *
 * Requirements: 7 (AC 1-9)
 */

import { NextRequest, NextResponse } from "next/server";
import { createAIClient, getModelForRoute } from "@/ai";
import { AI_TIMEOUT } from "@/app/coding-interview/lib/constants";
import {
  buildOpeningFollowUpPrompt,
  buildFollowUpPrompt,
  MAX_INTERVIEWER_QUESTIONS,
} from "@/ai/prompts";
import type {
  ConversationMessage,
  EvaluationReport,
  GeneratedProblem,
} from "@/app/coding-interview/lib/types";

const DEFAULT_BASE_URL =
  process.env.OPENAI_BASE_URL || "http://127.0.0.1:1234/v1";
const API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL = getModelForRoute("ai/coding-interview/follow-up");

const MAX_RESPONSE_LENGTH = 2000;

interface FollowUpRequest {
  code: string;
  evaluation: EvaluationReport;
  conversationHistory: ConversationMessage[];
  problem: GeneratedProblem;
  userResponse: string;
}

function countInterviewerMessages(history: ConversationMessage[]): number {
  return history.filter((msg) => msg.role === "interviewer").length;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as FollowUpRequest;

    // Validate required fields
    if (!body.code && body.code !== "") {
      return NextResponse.json(
        { error: "Missing required field: code" },
        { status: 400 },
      );
    }

    if (!body.evaluation) {
      return NextResponse.json(
        { error: "Missing required field: evaluation" },
        { status: 400 },
      );
    }

    if (!body.problem) {
      return NextResponse.json(
        { error: "Missing required field: problem" },
        { status: 400 },
      );
    }

    if (!Array.isArray(body.conversationHistory)) {
      return NextResponse.json(
        { error: "conversationHistory must be an array" },
        { status: 400 },
      );
    }

    // Validate userResponse length (only when not opening question)
    if (body.conversationHistory.length > 0) {
      if (!body.userResponse) {
        return NextResponse.json(
          { error: "Missing required field: userResponse" },
          { status: 400 },
        );
      }

      if (body.userResponse.length > MAX_RESPONSE_LENGTH) {
        return NextResponse.json(
          {
            error: `userResponse exceeds maximum length of ${MAX_RESPONSE_LENGTH} characters`,
          },
          { status: 400 },
        );
      }
    }

    // Check if conversation is complete (8+ interviewer messages)
    const interviewerCount = countInterviewerMessages(body.conversationHistory);
    if (interviewerCount >= MAX_INTERVIEWER_QUESTIONS) {
      return NextResponse.json({
        complete: true,
        message:
          "Thank you for the discussion. You've demonstrated your understanding thoroughly. Let's move on to the scoring and summary phase.",
      });
    }

    // Build appropriate prompt
    const prompt =
      body.conversationHistory.length === 0
        ? buildOpeningFollowUpPrompt(body)
        : buildFollowUpPrompt(body);

    const client = createAIClient({
      baseUrl: DEFAULT_BASE_URL,
      apiKey: API_KEY,
      defaultModel: MODEL,
    });

    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT);

    let fullResponse = "";

    try {
      const generator = client.generate(prompt);

      for await (const chunk of generator) {
        if (controller.signal.aborted) {
          break;
        }
        fullResponse += chunk;
      }

      clearTimeout(timeoutId);
    } catch (err) {
      clearTimeout(timeoutId);
      if (
        controller.signal.aborted ||
        (err instanceof Error && err.name === "AbortError")
      ) {
        return NextResponse.json(
          { error: "Follow-up generation timed out after 30 seconds" },
          { status: 504 },
        );
      }
      throw err;
    }

    if (controller.signal.aborted) {
      return NextResponse.json(
        { error: "Follow-up generation timed out after 30 seconds" },
        { status: 504 },
      );
    }

    const question = fullResponse.trim();

    if (!question) {
      return NextResponse.json(
        { error: "AI returned an empty response" },
        { status: 502 },
      );
    }

    return NextResponse.json({ question, complete: false });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
