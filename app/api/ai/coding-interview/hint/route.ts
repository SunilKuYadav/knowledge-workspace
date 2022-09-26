/**
 * API route for generating progressive coding interview hints.
 *
 * POST handler accepts { problemStatement, code, level, previousHints }
 * and returns level-appropriate hint content.
 *
 * Hint Levels:
 * 1: Clarifying question/restatement (no algorithms)
 * 2: Name the algorithmic approach (no implementation details)
 * 3: Specific data structure + why it's appropriate
 * 4: High-level pseudocode (5-15 lines, no language-specific syntax)
 *
 * Requirements: 8.2-8.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAIClient } from '@/ai';
import { AI_TIMEOUT } from '@/app/coding-interview/lib/constants';

const DEFAULT_BASE_URL = process.env.OPENAI_BASE_URL || 'http://127.0.0.1:1234/v1';
const API_KEY = process.env.OPENAI_API_KEY || '';
const MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

interface HintRequest {
  problemStatement: string;
  code: string;
  level: number;
  previousHints?: string[];
}

function buildHintPrompt(body: HintRequest): string {
  const { problemStatement, code, level, previousHints = [] } = body;

  const previousHintsSection = previousHints.length > 0
    ? `\nPrevious hints given:\n${previousHints.map((h, i) => `Level ${i + 1}: ${h}`).join('\n')}\n`
    : '';

  const levelInstructions: Record<number, string> = {
    1: `Provide a CLARIFYING QUESTION or RESTATEMENT of the problem that helps the user better understand what they need to solve.
DO NOT mention any algorithm, data structure, or approach name.
DO NOT give any implementation guidance.
Simply help them understand the problem requirements better by asking a thought-provoking question or restating the problem in a way that reveals a key insight.`,
    2: `Name the ALGORITHMIC APPROACH that would solve this problem optimally (e.g., "sliding window", "dynamic programming", "two pointers", "BFS/DFS", "greedy").
DO NOT provide any implementation details, pseudocode, or code.
DO NOT explain how to implement the approach.
Simply state the name of the approach and a one-sentence description of why it applies here.`,
    3: `Name the SPECIFIC DATA STRUCTURE(S) to use (e.g., "hash map", "min-heap", "monotonic stack", "trie") and explain WHY each is appropriate for this problem.
Explain what properties of the data structure make it a good fit.
DO NOT provide pseudocode or implementation details.
DO NOT provide code.`,
    4: `Provide HIGH-LEVEL PSEUDOCODE outlining the solution steps.
Requirements:
- Between 5 and 15 lines of pseudocode
- Use plain English descriptions of steps, NOT language-specific syntax
- DO NOT use JavaScript, TypeScript, Python, or any other programming language syntax
- Use indentation to show structure (loops, conditionals)
- Each line should describe WHAT to do, not HOW to do it in code
Example format:
  initialize result container
  for each element in input:
    if element meets condition:
      add to result
    else:
      update tracking variable
  return result`,
  };

  return `You are a senior software engineer providing progressive hints during a coding interview.

Problem:
${problemStatement}

User's current code:
${code || '(no code written yet)'}
${previousHintsSection}
You are providing a Level ${level} hint (out of 4 levels, where each level gives more detail).

${levelInstructions[level]}

Respond with ONLY the hint text. Do not include any prefix like "Hint:" or "Level X:". Just provide the actual hint content directly.`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as HintRequest;

    // Validate required fields
    if (!body.problemStatement) {
      return NextResponse.json(
        { error: 'Missing required field: problemStatement' },
        { status: 400 }
      );
    }

    if (typeof body.level !== 'number' || body.level < 1 || body.level > 4) {
      return NextResponse.json(
        { error: 'level must be an integer between 1 and 4' },
        { status: 400 }
      );
    }

    if (body.previousHints && !Array.isArray(body.previousHints)) {
      return NextResponse.json(
        { error: 'previousHints must be an array of strings' },
        { status: 400 }
      );
    }

    const client = createAIClient({ baseUrl: DEFAULT_BASE_URL, apiKey: API_KEY, defaultModel: MODEL });
    const prompt = buildHintPrompt(body);

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
          { error: 'Hint generation timed out after 30 seconds' },
          { status: 504 }
        );
      }
      throw err;
    }

    if (controller.signal.aborted) {
      return NextResponse.json(
        { error: 'Hint generation timed out after 30 seconds' },
        { status: 504 }
      );
    }

    const hint = fullResponse.trim();

    if (!hint) {
      return NextResponse.json(
        { error: 'AI returned an empty hint response' },
        { status: 502 }
      );
    }

    return NextResponse.json({ hint, level: body.level });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
