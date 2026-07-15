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
  "boilerplate": "string - ONLY the solution function signature with TODO comment that the user writes their code in",
  "harness": "string (optional) - hidden helper code: class definitions + __deserialize + __serialize functions. Only include if the problem uses custom data structures. This code is prepended at execution time but NOT shown to the user."
}

Requirements:
- tags: at least 2 items
- samples: at least 2 items, each with input, output, and explanation. Each explanation MUST include:
  1. An ASCII visual diagram showing the data structure (for trees, linked lists, graphs, etc.)
  2. A step-by-step walkthrough of the algorithm
  Example: "The tree:\\n      3\\n     / \\\\\\n    1   4\\n     \\\\\\n      2\\n\\nInorder: left(1) → right(2) → root(3) → right(4) = [1,2,3,4]"
  For array/string problems, show state changes at key steps. Use \\n for newlines.
- edgeCases: at least 2 items
- hiddenTestCases: at least 5 items covering various scenarios
- companyTags: between 1 and 5 items
- expectedTimeComplexity and expectedSpaceComplexity must be valid Big-O notation
- boilerplate: ONLY the function signature the user implements (e.g., "function reverseList(head: ListNode | null): ListNode | null {\\n  // TODO: Implement solution\\n}"). Do NOT include class definitions or helper functions here.
- harness: (only for data structure problems) All supporting code: class definitions, __deserialize, __serialize. This is hidden from the user but runs before their code.
- boilerplate must be valid ${language} code with a clear function signature
- The problem must have at least one valid solution implementable within 45 minutes

DATA STRUCTURE BOILERPLATE — HARNESS CONVENTION:
If the problem involves ANY custom data structure (linked lists, binary trees, n-ary trees, graphs, tries, heaps, doubly-linked lists, etc.), the boilerplate MUST include:
1. Class definitions for the data structures
2. A \`__deserialize(input)\` function that converts the raw JSON test input array into the arguments the solution function expects
3. A \`__serialize(output)\` function that converts the solution's return value back to plain JSON for comparison

The execution engine does: __deserialize(testCase.input) → solution(...args) → __serialize(rawOutput) → deepEqual(result, expectedOutput)
If __deserialize/__serialize are NOT defined (simple problems like arrays/strings), input is spread directly as args.

EXAMPLE — Linked List boilerplate:
\`\`\`
// harness (hidden from user):
class ListNode {
  val: number;
  next: ListNode | null;
  constructor(val = 0, next: ListNode | null = null) { this.val = val; this.next = next; }
}

function __deserialize(input: [number[]]): [ListNode | null] {
  const arr = input[0];
  if (!arr || arr.length === 0) return [null];
  const head = new ListNode(arr[0]);
  let cur = head;
  for (let i = 1; i < arr.length; i++) { cur.next = new ListNode(arr[i]); cur = cur.next; }
  return [head];
}

function __serialize(output: ListNode | null): number[] {
  const result: number[] = [];
  let cur = output;
  while (cur) { result.push(cur.val); cur = cur.next; }
  return result;
}

// boilerplate (shown to user):
function reverseList(head: ListNode | null): ListNode | null {
  // TODO: Implement solution
}
\`\`\`
In the JSON response:
- "boilerplate": "function reverseList(head: ListNode | null): ListNode | null {\\n  // TODO: Implement solution\\n}"
- "harness": "class ListNode {\\n  val: number;\\n  next: ListNode | null;\\n  constructor(val = 0, next: ListNode | null = null) { this.val = val; this.next = next; }\\n}\\n\\nfunction __deserialize(input: [number[]]): [ListNode | null] {\\n  const arr = input[0];\\n  if (!arr || arr.length === 0) return [null];\\n  const head = new ListNode(arr[0]);\\n  let cur = head;\\n  for (let i = 1; i < arr.length; i++) { cur.next = new ListNode(arr[i]); cur = cur.next; }\\n  return [head];\\n}\\n\\nfunction __serialize(output: ListNode | null): number[] {\\n  const result: number[] = [];\\n  let cur = output;\\n  while (cur) { result.push(cur.val); cur = cur.next; }\\n  return result;\\n}"

EXAMPLE — Binary Tree boilerplate:
\`\`\`
// harness (hidden from user):
class TreeNode {
  val: number;
  left: TreeNode | null;
  right: TreeNode | null;
  constructor(val = 0, left: TreeNode | null = null, right: TreeNode | null = null) { this.val = val; this.left = left; this.right = right; }
}

function __deserialize(input: [(number | null)[]]): [TreeNode | null] {
  const arr = input[0];
  if (!arr || arr.length === 0 || arr[0] === null) return [null];
  const root = new TreeNode(arr[0]);
  const queue: TreeNode[] = [root];
  let i = 1;
  while (queue.length > 0 && i < arr.length) {
    const node = queue.shift()!;
    if (i < arr.length && arr[i] !== null) { node.left = new TreeNode(arr[i] as number); queue.push(node.left); }
    i++;
    if (i < arr.length && arr[i] !== null) { node.right = new TreeNode(arr[i] as number); queue.push(node.right); }
    i++;
  }
  return [root];
}

function __serialize(output: number[]): number[] {
  return output;
}

// boilerplate (shown to user):
function inorderTraversal(root: TreeNode | null): number[] {
  // TODO: Implement solution
}
\`\`\`
In the JSON response:
- "boilerplate": "function inorderTraversal(root: TreeNode | null): number[] {\\n  // TODO: Implement solution\\n}"
- "harness": contains TreeNode class + __deserialize + __serialize

This pattern works for ANY data structure. For graph problems, __deserialize builds the adjacency list/matrix. For n-ary trees, it builds the tree from the serialized format. The AI provides the correct conversion logic per problem.

IMPORTANT: If the problem needs EXTRA CONSTRUCTION METADATA beyond the data structure values (e.g., cycle position for cycle detection, random pointer indices, parent node references), the __deserialize tuple type MUST include those extra parameters and hiddenTestCases inputs MUST provide them. Example: input type [number[], number] for [values, cyclePos], with test case input [[3,2,0,-4], 1].

CRITICAL TEST CASE FORMAT RULES:
The execution engine calls __deserialize(testCase.input) if it exists, otherwise spreads input as args.
- "input" MUST be a JSON array of the function arguments: [[1,2,1,2,1], 3]
- "expectedOutput" MUST be the JSON return value (after __serialize): 4

More examples (for problems WITHOUT data structures):
- For \`function twoSum(nums: number[], target: number)\`:
  input: [[2,7,11,15], 9], expectedOutput: [0,1]
- For \`function isValid(s: string)\`:
  input: ["(())"], expectedOutput: true

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
