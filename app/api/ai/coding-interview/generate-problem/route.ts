/**
 * API route for generating AI coding interview problems.
 *
 * POST handler accepts { source, context, language, difficulty } and returns
 * a GeneratedProblem JSON object with full problem metadata.
 *
 * Requirements: 4.1-4.9
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAIClient } from '@/ai';
import { AI_TIMEOUT } from '@/app/coding-interview/lib/constants';
import type {
  InterviewSource,
  InterviewContext,
  GeneratedProblem,
} from '@/app/coding-interview/lib/types';

const DEFAULT_BASE_URL = process.env.OPENAI_BASE_URL || 'http://127.0.0.1:1234/v1';
const API_KEY = process.env.OPENAI_API_KEY || '';
const MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

interface GenerateProblemRequest {
  source: InterviewSource;
  context?: InterviewContext;
  language?: 'javascript' | 'typescript';
  difficulty?: 'easy' | 'medium' | 'hard';
  userPrompt?: string;
}

function buildProblemGenerationPrompt(body: GenerateProblemRequest): string {
  const { source, context, language = 'javascript', difficulty, userPrompt } = body;

  let contextSection = '';
  if (userPrompt) {
    contextSection = `
The user has requested the following type of problem:
"${userPrompt}"
Generate a problem that matches this description.`;
  } else if (context) {
    if (context.source === 'problem') {
      contextSection = `
The problem should be related to:
- Category: ${context.category}
- Tags: ${context.tags.join(', ')}
- Reference problem: "${context.title}"
Generate a problem whose category or tags overlap with these.`;
    } else if (context.source === 'topic') {
      contextSection = `
The problem should cover concepts from:
- Topic: "${context.title}"
- Concepts: ${context.concepts.join(', ')}
Generate a problem whose tags or category overlap with these concepts.`;
    } else if (context.source === 'revision') {
      contextSection = `
This is a revision session. Generate a problem that tests retention of previously studied topics.`;
    }
  }

  const difficultySection = difficulty
    ? `\nDifficulty MUST be exactly: "${difficulty}"`
    : '\nChoose an appropriate difficulty (easy, medium, or hard).';

  return `You are a senior software engineer and coding interview expert. Generate a realistic coding interview problem.

${contextSection}
${difficultySection}

Language: ${language}
Source context: ${source}

Generate a complete coding interview problem and respond with ONLY a valid JSON object (no markdown, no code blocks, no explanation) matching this exact structure:

{
  "title": "string - descriptive problem title",
  "difficulty": "easy" | "medium" | "hard",
  "category": "string - e.g., Arrays, Trees, Dynamic Programming, Graphs, etc.",
  "tags": ["string array - at least 2 relevant algorithm/data-structure tags"],
  "statement": "string - full problem description with context and requirements",
  "constraints": ["string array - input constraints like '1 <= n <= 10^5'"],
  "inputFormat": "string - description of input format",
  "outputFormat": "string - description of expected output format",
  "samples": [
    {
      "input": "string - example input",
      "output": "string - expected output",
      "explanation": "string - step-by-step explanation"
    }
  ],
  "edgeCases": [
    {
      "description": "string - what edge case this tests",
      "input": "string - edge case input",
      "expectedOutput": "string - expected output for this edge case"
    }
  ],
  "hiddenTestCases": [
    {
      "input": "any - test input value",
      "expectedOutput": "any - expected output value"
    }
  ],
  "expectedTimeComplexity": "string - Big-O notation e.g., O(n log n)",
  "expectedSpaceComplexity": "string - Big-O notation e.g., O(n)",
  "companyTags": ["string array - 1 to 5 companies that ask similar questions"],
  "boilerplate": "string - starter code in ${language} with function signature and TODO comment"
}

Requirements:
- tags: at least 2 items
- samples: at least 2 items, each with input, output, and explanation
- edgeCases: at least 2 items
- hiddenTestCases: at least 5 items covering various scenarios
- companyTags: between 1 and 5 items
- expectedTimeComplexity and expectedSpaceComplexity must be valid Big-O notation
- boilerplate must be valid ${language} code with a clear function signature
- The problem must have at least one valid solution implementable within 45 minutes

Respond with ONLY the JSON object.`;
}

function validateGeneratedProblem(data: unknown): data is GeneratedProblem {
  if (!data || typeof data !== 'object') return false;

  const problem = data as Record<string, unknown>;

  // Check required string fields
  const requiredStrings = [
    'title', 'difficulty', 'category', 'statement',
    'inputFormat', 'outputFormat', 'expectedTimeComplexity',
    'expectedSpaceComplexity', 'boilerplate',
  ];
  for (const field of requiredStrings) {
    if (typeof problem[field] !== 'string' || (problem[field] as string).length === 0) {
      return false;
    }
  }

  // Validate difficulty
  if (!['easy', 'medium', 'hard'].includes(problem.difficulty as string)) {
    return false;
  }

  // Validate arrays with minimum counts
  if (!Array.isArray(problem.tags) || problem.tags.length < 2) return false;
  if (!Array.isArray(problem.samples) || problem.samples.length < 2) return false;
  if (!Array.isArray(problem.edgeCases) || problem.edgeCases.length < 2) return false;
  if (!Array.isArray(problem.hiddenTestCases) || problem.hiddenTestCases.length < 5) return false;
  if (!Array.isArray(problem.companyTags) || problem.companyTags.length < 1 || problem.companyTags.length > 5) return false;
  if (!Array.isArray(problem.constraints)) return false;

  // Validate sample structure
  for (const sample of problem.samples as Array<Record<string, unknown>>) {
    if (typeof sample.input !== 'string' || typeof sample.output !== 'string' || typeof sample.explanation !== 'string') {
      return false;
    }
  }

  // Validate edge case structure
  for (const edgeCase of problem.edgeCases as Array<Record<string, unknown>>) {
    if (typeof edgeCase.description !== 'string' || typeof edgeCase.input !== 'string' || typeof edgeCase.expectedOutput !== 'string') {
      return false;
    }
  }

  // Validate hidden test case structure
  for (const testCase of problem.hiddenTestCases as Array<Record<string, unknown>>) {
    if (!('input' in testCase) || !('expectedOutput' in testCase)) {
      return false;
    }
  }

  return true;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateProblemRequest;

    // Validate required fields
    if (!body.source) {
      return NextResponse.json(
        { error: 'Missing required field: source' },
        { status: 400 }
      );
    }

    const validSources: InterviewSource[] = ['problem', 'topic', 'self-test', 'revision', 'practice', 'interview'];
    if (!validSources.includes(body.source)) {
      return NextResponse.json(
        { error: `Invalid source: ${body.source}` },
        { status: 400 }
      );
    }

    if (body.difficulty && !['easy', 'medium', 'hard'].includes(body.difficulty)) {
      return NextResponse.json(
        { error: `Invalid difficulty: ${body.difficulty}` },
        { status: 400 }
      );
    }

    if (body.language && !['javascript', 'typescript'].includes(body.language)) {
      return NextResponse.json(
        { error: `Invalid language: ${body.language}` },
        { status: 400 }
      );
    }

    const client = createAIClient({ baseUrl: DEFAULT_BASE_URL, apiKey: API_KEY, defaultModel: MODEL });
    const prompt = buildProblemGenerationPrompt(body);

    // Use AbortController for 30s timeout
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
          { error: 'Problem generation timed out after 30 seconds' },
          { status: 504 }
        );
      }
      throw err;
    }

    if (controller.signal.aborted) {
      return NextResponse.json(
        { error: 'Problem generation timed out after 30 seconds' },
        { status: 504 }
      );
    }

    // Parse JSON from response — handle markdown code blocks
    let jsonStr = fullResponse.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.slice(7);
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.slice(3);
    }
    if (jsonStr.endsWith('```')) {
      jsonStr = jsonStr.slice(0, -3);
    }
    jsonStr = jsonStr.trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse AI response as valid JSON' },
        { status: 502 }
      );
    }

    // Validate the parsed response matches GeneratedProblem structure
    if (!validateGeneratedProblem(parsed)) {
      return NextResponse.json(
        { error: 'AI response does not match required problem structure' },
        { status: 502 }
      );
    }

    return NextResponse.json(parsed as GeneratedProblem);
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
