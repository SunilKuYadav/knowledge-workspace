/**
 * Coding interview module prompt builders.
 *
 * Centralizes all prompts previously inline in:
 * - app/api/ai/coding-interview/generate-problem/route.ts
 * - app/api/ai/coding-interview/evaluate/route.ts
 * - app/api/ai/coding-interview/hint/route.ts
 * - app/api/ai/coding-interview/follow-up/route.ts
 * - app/api/ai/coding-interview/score/route.ts
 */

import type {
  ConversationMessage,
  EvaluationReport,
  GeneratedProblem,
  TestCaseResult,
  InterviewSource,
  InterviewContext,
  VariationSummary,
} from "@/app/coding-interview/lib/types";

// ─── Constants ──────────────────────────────────────────────────────────────

export const FOLLOW_UP_TOPIC_AREAS = [
  "alternative approaches (different algorithms or data structures that could solve this)",
  "time/space trade-offs (how changing one affects the other)",
  "behavior with large inputs (scalability, performance at scale)",
  "memory considerations (memory usage patterns, garbage collection, buffer management)",
  "iterative versus recursive solutions (pros/cons, when to choose one over the other)",
  "production considerations (error handling, logging, testing, maintainability)",
];

export const MAX_INTERVIEWER_QUESTIONS = 8;

const HINT_LEVEL_INSTRUCTIONS: Record<number, string> = {
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

// ─── Generate Problem ───────────────────────────────────────────────────────

export interface GenerateProblemParams {
  source: InterviewSource;
  context?: InterviewContext;
  language?: "javascript" | "typescript";
  difficulty?: "easy" | "medium" | "hard";
  userPrompt?: string;
}

export function buildProblemGenerationPrompt(
  params: GenerateProblemParams,
): string {
  const {
    source,
    context,
    language = "typescript",
    difficulty,
    userPrompt,
  } = params;

  let contextSection = "";
  if (userPrompt) {
    contextSection = `
The user has requested the following type of problem:
"${userPrompt}"
Generate a problem that matches this description.`;
  } else if (context) {
    if (context.source === "problem") {
      // Build list of solved items to exclude
      const solvedItems: string[] = [];
      if (context.problemStatus === "solved") {
        solvedItems.push(`Main problem: "${context.title}"`);
      }

      const unsolvedVariations: VariationSummary[] = [];
      const solvedVariations: VariationSummary[] = [];
      if (context.variations?.length) {
        for (const v of context.variations) {
          if (v.status === "solved") {
            solvedVariations.push(v);
            solvedItems.push(`Variation: "${v.title}" (${v.difficulty})`);
          } else {
            unsolvedVariations.push(v);
          }
        }
      }

      // Build variation context
      let variationContext = "";
      if (unsolvedVariations.length > 0) {
        variationContext = `
Unsolved variations of this problem (DO NOT regenerate these, but generate something at a SIMILAR difficulty/pattern level):
${unsolvedVariations.map((v) => `- "${v.title}" [${v.difficulty}] tags: ${(v.tags || []).join(", ")}`).join("\n")}`;
      }

      let exclusionContext = "";
      if (solvedItems.length > 0) {
        exclusionContext = `
IMPORTANT — The user has already SOLVED the following. Do NOT generate a problem that is identical or trivially similar to any of these:
${solvedItems.map((s) => `- ${s}`).join("\n")}
Generate a DIFFERENT problem that tests similar concepts but with a distinct twist, different constraints, or a novel angle.`;
      }

      contextSection = `
The problem should be related to:
${context.category ? `- Category: ${context.category}` : ""}
- Tags: ${context.tags.join(", ")}
- Reference problem: "${context.title}"
- Problem solve status: ${context.problemStatus || "unknown"}
${variationContext}
${exclusionContext}
Generate a problem whose category or tags overlap with these, but that is distinct from any already-solved problems or variations listed above.`;
    } else if (context.source === "topic") {
      let exclusionContext = "";
      if (context.avoidProblems && context.avoidProblems.length > 0) {
        exclusionContext = `

IMPORTANT — The user already has the following PRACTICE PROBLEMS for this topic. Do NOT generate a problem that is identical or trivially similar to any of these:
${context.avoidProblems.map((p) => `- "${p}"`).join("\n")}
Generate a DIFFERENT problem that tests the same topic concepts but from a distinct angle, with different constraints, or a novel twist. The problem should complement these existing practice problems, not duplicate them.`;
      }

      contextSection = `
The problem should cover concepts from:
- Topic: "${context.title}"
- Concepts: ${context.concepts.join(", ")}
${exclusionContext}
Generate a problem whose tags or category overlap with these concepts.`;
    } else if (context.source === "revision") {
      contextSection = `
This is a revision session. Generate a problem that tests retention of previously studied topics.`;
    }
  }

  const difficultySection = difficulty
    ? `\nDifficulty MUST be exactly: "${difficulty}"`
    : "\nChoose an appropriate difficulty (easy, medium, or hard).";

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
      "input": "[arg1, arg2, ...] - JSON array of function arguments",
      "expectedOutput": "any - the actual JSON return value"
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

CRITICAL TEST CASE FORMAT RULES:
The execution engine calls the user's function by spreading the "input" array as arguments.
For example, if the boilerplate is \`function subarraySum(nums: number[], k: number)\`:
- "input" MUST be a JSON array of the function arguments: [[1,2,1,2,1], 3]
- "expectedOutput" MUST be the JSON return value: 4

More examples:
- For \`function twoSum(nums: number[], target: number)\`:
  input: [[2,7,11,15], 9], expectedOutput: [0,1]
- For \`function isValid(s: string)\`:
  input: ["(())"], expectedOutput: true
- For \`function maxProfit(prices: number[])\`:
  input: [[7,1,5,3,6,4]], expectedOutput: 5

DO NOT use string representations like "nums = [1,2,3], k = 3" or "1 2 1 2 1\\n3".

FORMAT BY SECTION:
- "samples": Used for display. "input" and "output" are human-readable strings (e.g., "nums = [1,2,1,2,1], k = 3" / "4").
- "edgeCases": Used for display. "input" and "expectedOutput" are human-readable strings. "description" explains what it tests.
- "hiddenTestCases": Used for EXECUTION. "input" MUST be a JSON array of actual function arguments. "expectedOutput" MUST be the actual JSON return value (number, boolean, array, string, null — NOT a string representation).

Respond with ONLY the JSON object.`;
}

// ─── Evaluate ───────────────────────────────────────────────────────────────

export function buildEvaluatePrompt(
  code: string,
  language: string,
  problem: GeneratedProblem,
  testResults: TestCaseResult[],
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
${problem.constraints.join("\n")}

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
      `Test ${i + 1}: ${r.passed ? "PASS" : "FAIL"} | Input: ${JSON.stringify(r.input)} | Expected: ${JSON.stringify(r.expectedOutput)} | Got: ${JSON.stringify(r.actualOutput)} | Time: ${r.executionTimeMs}ms`,
  )
  .join("\n")}

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

// ─── Hint ───────────────────────────────────────────────────────────────────

export interface HintParams {
  problemStatement: string;
  code: string;
  level: number;
  previousHints?: string[];
}

export function buildCodingInterviewHintPrompt(params: HintParams): string {
  const { problemStatement, code, level, previousHints = [] } = params;

  const previousHintsSection =
    previousHints.length > 0
      ? `\nPrevious hints given:\n${previousHints.map((h, i) => `Level ${i + 1}: ${h}`).join("\n")}\n`
      : "";

  return `You are a senior software engineer providing progressive hints during a coding interview.

Problem:
${problemStatement}

User's current code:
${code || "(no code written yet)"}
${previousHintsSection}
You are providing a Level ${level} hint (out of 4 levels, where each level gives more detail).

${HINT_LEVEL_INSTRUCTIONS[level]}

Respond with ONLY the hint text. Do not include any prefix like "Hint:" or "Level X:". Just provide the actual hint content directly.`;
}

// ─── Follow-Up ──────────────────────────────────────────────────────────────

export interface FollowUpParams {
  code: string;
  evaluation: EvaluationReport;
  conversationHistory: ConversationMessage[];
  problem: GeneratedProblem;
  userResponse: string;
}

export function buildOpeningFollowUpPrompt(params: FollowUpParams): string {
  const { code, evaluation, problem } = params;

  return `You are a senior software engineer conducting a coding interview follow-up discussion.

The candidate has just submitted their solution. Your role is to ask insightful follow-up questions that explore their understanding of the problem and their approach.

Problem:
${problem.title} (${problem.difficulty})
${problem.statement}

Candidate's submitted code:
${code}

Evaluation summary:
- Tests passed: ${evaluation.correctness.testsPassed}/${evaluation.correctness.testsTotal}
- Algorithm optimal: ${evaluation.algorithmChoice.isOptimal ? "Yes" : "No"}
- Time complexity: ${evaluation.complexityAnalysis.timeComplexity}
- Space complexity: ${evaluation.complexityAnalysis.spaceComplexity}
- Code quality score: ${evaluation.codeQuality.score}/100

Generate an opening follow-up question that references specific details from the candidate's code. The question should be conversational, as a senior engineer would ask in a real interview.

Choose from these topic areas for your questions throughout the discussion:
${FOLLOW_UP_TOPIC_AREAS.map((t, i) => `${i + 1}. ${t}`).join("\n")}

Start with a question about their approach choice or a notable aspect of their implementation.

Respond with ONLY the question text. Do not include any prefix or labels.`;
}

export function buildFollowUpPrompt(params: FollowUpParams): string {
  const { code, evaluation, conversationHistory, problem, userResponse } =
    params;

  const historyText = conversationHistory
    .map(
      (msg) =>
        `${msg.role === "interviewer" ? "Interviewer" : "Candidate"}: ${msg.content}`,
    )
    .join("\n\n");

  const questionsAsked = conversationHistory.filter(
    (msg) => msg.role === "interviewer",
  ).length;
  const remainingQuestions = MAX_INTERVIEWER_QUESTIONS - questionsAsked;

  const coveredTopicsHint =
    questionsAsked > 0
      ? `\nYou have asked ${questionsAsked} questions so far. You have ${remainingQuestions} questions remaining. Try to cover different topic areas from the list below that haven't been explored yet.`
      : "";

  return `You are a senior software engineer conducting a coding interview follow-up discussion.

Problem:
${problem.title} (${problem.difficulty})
${problem.statement}

Candidate's submitted code:
${code}

Evaluation summary:
- Tests passed: ${evaluation.correctness.testsPassed}/${evaluation.correctness.testsTotal}
- Algorithm optimal: ${evaluation.algorithmChoice.isOptimal ? "Yes" : "No"}
- Time complexity: ${evaluation.complexityAnalysis.timeComplexity}
- Space complexity: ${evaluation.complexityAnalysis.spaceComplexity}

Conversation so far:
${historyText}

Candidate's latest response:
${userResponse}
${coveredTopicsHint}

Topic areas to explore:
${FOLLOW_UP_TOPIC_AREAS.map((t, i) => `${i + 1}. ${t}`).join("\n")}

Instructions:
- Analyze the candidate's latest response carefully.
- If the response is incomplete, vague, or incorrect, provide a brief hint about what aspect they should reconsider, then ask a narrower follow-up question to guide them.
- If the response demonstrates good understanding, acknowledge briefly and move to a new topic area.
- Reference specific details from their code or previous answers.
- Keep your response concise and conversational.

Respond with ONLY the follow-up question (including any hint if needed). Do not include labels or prefixes.`;
}

// ─── Score ──────────────────────────────────────────────────────────────────

export function buildScorePrompt(
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
