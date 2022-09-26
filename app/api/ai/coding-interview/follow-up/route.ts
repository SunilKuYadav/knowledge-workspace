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

import { NextRequest, NextResponse } from 'next/server';
import { createAIClient } from '@/ai';
import { AI_TIMEOUT } from '@/app/coding-interview/lib/constants';
import type {
  ConversationMessage,
  EvaluationReport,
  GeneratedProblem,
} from '@/app/coding-interview/lib/types';

const DEFAULT_BASE_URL = process.env.OPENAI_BASE_URL || 'http://127.0.0.1:1234/v1';
const API_KEY = process.env.OPENAI_API_KEY || '';
const MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

const MAX_RESPONSE_LENGTH = 2000;
const MAX_INTERVIEWER_QUESTIONS = 8;

interface FollowUpRequest {
  code: string;
  evaluation: EvaluationReport;
  conversationHistory: ConversationMessage[];
  problem: GeneratedProblem;
  userResponse: string;
}

const TOPIC_AREAS = [
  'alternative approaches (different algorithms or data structures that could solve this)',
  'time/space trade-offs (how changing one affects the other)',
  'behavior with large inputs (scalability, performance at scale)',
  'memory considerations (memory usage patterns, garbage collection, buffer management)',
  'iterative versus recursive solutions (pros/cons, when to choose one over the other)',
  'production considerations (error handling, logging, testing, maintainability)',
];

function countInterviewerMessages(history: ConversationMessage[]): number {
  return history.filter((msg) => msg.role === 'interviewer').length;
}

function buildOpeningPrompt(body: FollowUpRequest): string {
  const { code, evaluation, problem } = body;

  return `You are a senior software engineer conducting a coding interview follow-up discussion.

The candidate has just submitted their solution. Your role is to ask insightful follow-up questions that explore their understanding of the problem and their approach.

Problem:
${problem.title} (${problem.difficulty})
${problem.statement}

Candidate's submitted code:
${code}

Evaluation summary:
- Tests passed: ${evaluation.correctness.testsPassed}/${evaluation.correctness.testsTotal}
- Algorithm optimal: ${evaluation.algorithmChoice.isOptimal ? 'Yes' : 'No'}
- Time complexity: ${evaluation.complexityAnalysis.timeComplexity}
- Space complexity: ${evaluation.complexityAnalysis.spaceComplexity}
- Code quality score: ${evaluation.codeQuality.score}/100

Generate an opening follow-up question that references specific details from the candidate's code. The question should be conversational, as a senior engineer would ask in a real interview.

Choose from these topic areas for your questions throughout the discussion:
${TOPIC_AREAS.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Start with a question about their approach choice or a notable aspect of their implementation.

Respond with ONLY the question text. Do not include any prefix or labels.`;
}

function buildFollowUpPrompt(body: FollowUpRequest): string {
  const { code, evaluation, conversationHistory, problem, userResponse } = body;

  const historyText = conversationHistory
    .map((msg) => `${msg.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${msg.content}`)
    .join('\n\n');

  const questionsAsked = countInterviewerMessages(conversationHistory);
  const remainingQuestions = MAX_INTERVIEWER_QUESTIONS - questionsAsked;

  // Determine which topics have been covered
  const coveredTopicsHint = questionsAsked > 0
    ? `\nYou have asked ${questionsAsked} questions so far. You have ${remainingQuestions} questions remaining. Try to cover different topic areas from the list below that haven't been explored yet.`
    : '';

  return `You are a senior software engineer conducting a coding interview follow-up discussion.

Problem:
${problem.title} (${problem.difficulty})
${problem.statement}

Candidate's submitted code:
${code}

Evaluation summary:
- Tests passed: ${evaluation.correctness.testsPassed}/${evaluation.correctness.testsTotal}
- Algorithm optimal: ${evaluation.algorithmChoice.isOptimal ? 'Yes' : 'No'}
- Time complexity: ${evaluation.complexityAnalysis.timeComplexity}
- Space complexity: ${evaluation.complexityAnalysis.spaceComplexity}

Conversation so far:
${historyText}

Candidate's latest response:
${userResponse}
${coveredTopicsHint}

Topic areas to explore:
${TOPIC_AREAS.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Instructions:
- Analyze the candidate's latest response carefully.
- If the response is incomplete, vague, or incorrect, provide a brief hint about what aspect they should reconsider, then ask a narrower follow-up question to guide them.
- If the response demonstrates good understanding, acknowledge briefly and move to a new topic area.
- Reference specific details from their code or previous answers.
- Keep your response concise and conversational.

Respond with ONLY the follow-up question (including any hint if needed). Do not include labels or prefixes.`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as FollowUpRequest;

    // Validate required fields
    if (!body.code && body.code !== '') {
      return NextResponse.json(
        { error: 'Missing required field: code' },
        { status: 400 }
      );
    }

    if (!body.evaluation) {
      return NextResponse.json(
        { error: 'Missing required field: evaluation' },
        { status: 400 }
      );
    }

    if (!body.problem) {
      return NextResponse.json(
        { error: 'Missing required field: problem' },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.conversationHistory)) {
      return NextResponse.json(
        { error: 'conversationHistory must be an array' },
        { status: 400 }
      );
    }

    // Validate userResponse length (only when not opening question)
    if (body.conversationHistory.length > 0) {
      if (!body.userResponse) {
        return NextResponse.json(
          { error: 'Missing required field: userResponse' },
          { status: 400 }
        );
      }

      if (body.userResponse.length > MAX_RESPONSE_LENGTH) {
        return NextResponse.json(
          { error: `userResponse exceeds maximum length of ${MAX_RESPONSE_LENGTH} characters` },
          { status: 400 }
        );
      }
    }

    // Check if conversation is complete (8+ interviewer messages)
    const interviewerCount = countInterviewerMessages(body.conversationHistory);
    if (interviewerCount >= MAX_INTERVIEWER_QUESTIONS) {
      return NextResponse.json({
        complete: true,
        message: 'Thank you for the discussion. You\'ve demonstrated your understanding thoroughly. Let\'s move on to the scoring and summary phase.',
      });
    }

    // Build appropriate prompt
    const prompt = body.conversationHistory.length === 0
      ? buildOpeningPrompt(body)
      : buildFollowUpPrompt(body);

    const client = createAIClient({ baseUrl: DEFAULT_BASE_URL, apiKey: API_KEY, defaultModel: MODEL });

    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT);

    let fullResponse = '';

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
      if (controller.signal.aborted || (err instanceof Error && err.name === 'AbortError')) {
        return NextResponse.json(
          { error: 'Follow-up generation timed out after 30 seconds' },
          { status: 504 }
        );
      }
      throw err;
    }

    if (controller.signal.aborted) {
      return NextResponse.json(
        { error: 'Follow-up generation timed out after 30 seconds' },
        { status: 504 }
      );
    }

    const question = fullResponse.trim();

    if (!question) {
      return NextResponse.json(
        { error: 'AI returned an empty response' },
        { status: 502 }
      );
    }

    return NextResponse.json({ question, complete: false });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
