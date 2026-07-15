/**
 * Problem-specific prompt builders.
 *
 * Centralizes all prompts previously inline in:
 * - app/api/ai/problem/generate-description/route.ts
 * - app/api/ai/problem/generate-note/route.ts
 * - app/api/ai/problem/generate-variation/route.ts
 */

import { formatSemanticContext } from "../utils/format";
import type { SemanticDescription } from "@/types";

// ─── Generate Description ───────────────────────────────────────────────────

export interface GenerateDescriptionParams {
  problemId: string;
  title: string;
  difficulty: string;
  patterns: string[];
  companies: string[];
  url?: string;
  semanticDescription?: SemanticDescription;
}

export function buildGenerateDescriptionPrompt(
  params: GenerateDescriptionParams,
): string {
  const semanticContext = formatSemanticContext(params.semanticDescription);

  return `You are a senior software engineer and coding interview expert.

Generate a complete problem description for the following LeetCode-style coding problem.
The output must be compatible with both a problem workspace and a timed coding interview module.

Problem Title: ${params.title}
Difficulty: ${params.difficulty}
Patterns: ${params.patterns.join(", ")}
Companies: ${params.companies.join(", ") || "Not specified"}
${params.url ? `Original URL: ${params.url}` : ""}
${semanticContext ? `\n${semanticContext}\n` : ""}

Return ONLY a valid JSON object with this exact structure (no markdown, no commentary):
{
  "description": "Full problem statement in Markdown. Include context, requirements, and any relevant background.",
  "category": "string - primary category e.g., Arrays, Trees, Dynamic Programming, Graphs, Strings, etc.",
  "tags": ["string array - at least 2 relevant algorithm/data-structure tags from the patterns"],
  "constraints": ["1 <= n <= 10^5", "...", "..."],
  "inputFormat": "string - description of what the function receives as input",
  "outputFormat": "string - description of what the function should return",
  "examples": [
    {
      "input": "nums = [2,7,11,15], target = 9",
      "expectedOutput": "[0,1]",
      "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]."
    },
    {
      "input": "nums = [3,2,4], target = 6",
      "expectedOutput": "[1,2]",
      "explanation": "Because nums[1] + nums[2] == 6, we return [1, 2]."
    }
  ],
  "edgeCases": [
    {
      "description": "string - what edge case this tests",
      "input": "string - edge case input",
      "expectedOutput": "string - expected output for this edge case"
    }
  ],
  "testCases": [
    { "input": "...", "expectedOutput": "..." },
    { "input": "...", "expectedOutput": "..." },
    { "input": "...", "expectedOutput": "..." },
    { "input": "...", "expectedOutput": "..." },
    { "input": "...", "expectedOutput": "..." }
  ],
  "timeComplexity": "O(n)",
  "spaceComplexity": "O(n)",
  "companyTags": ["string array - 1 to 5 companies known to ask this or similar questions"],
  "boilerplate": "function twoSum(nums: number[], target: number): number[] {\\n  // Your code here\\n}",
  "harness": "string (optional) - hidden helper code with class definitions + __deserialize + __serialize. Only for data structure problems."
}

CRITICAL: Test case format rules (examples, edgeCases, testCases):
- "input" must match the boilerplate function signature using named parameters.
  For a function like \`isValid(s: string)\`, use: "input": "s = \\"()\\""
  For a function like \`twoSum(nums: number[], target: number)\`, use: "input": "nums = [2,7,11,15], target = 9"
  For data structure problems, use simple JSON representations:
  For \`reverseList(head: ListNode | null)\`, use: "input": "head = [1,2,3,4,5]"
  For \`inorderTraversal(root: TreeNode | null)\`, use: "input": "root = [1,null,2,3]"
- "expectedOutput" must be a valid JSON literal representing the return value:
  - Booleans: "true" or "false" (not "True", "False")
  - Numbers: "42", "3.14"
  - Arrays: "[0,1]", "[[1,2],[3,4]]"
  - Strings: "\\"hello\\""  (JSON-escaped string)
  - null: "null"
- Do NOT wrap string inputs in extra quotes. For a string parameter, use: s = \\"()\\" not s = "()"
- Do NOT include variable assignment syntax in expectedOutput. Just the value.

DATA STRUCTURE BOILERPLATE — HARNESS CONVENTION:
If the problem involves ANY custom data structure (linked lists, binary trees, n-ary trees, graphs, tries, heaps, doubly-linked lists, etc.), the boilerplate MUST include:
1. Class definitions for the data structures
2. A \`__deserialize(input)\` function that converts the raw JSON test input array into the arguments the solution function expects
3. A \`__serialize(output)\` function that converts the solution's return value back to plain JSON for comparison

The execution engine calls these automatically:
- \`__deserialize(testCase.input)\` → returns array of args to spread into the solution function
- solution(...args) → raw output
- \`__serialize(rawOutput)\` → plain JSON value compared with expectedOutput via deep equality

EXAMPLE — Linked List problem boilerplate:
\`\`\`
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

function reverseList(head: ListNode | null): ListNode | null {
  // Your code here
}
\`\`\`
Test cases use: "input": "head = [1,2,3,4,5]", "expectedOutput": "[5,4,3,2,1]"

EXAMPLE — Binary Tree problem boilerplate:
\`\`\`
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
  return output; // Already plain array from inorder traversal
}

function inorderTraversal(root: TreeNode | null): number[] {
  // Your code here
}
\`\`\`
Test cases use level-order BFS arrays: "input": "root = [1,null,2,3]", "expectedOutput": "[1,3,2]"

For ANY other data structure (n-ary tree, graph adjacency list, trie, doubly-linked list, etc.),
follow the same pattern: define classes + __deserialize + __serialize.
The __deserialize function receives the raw test case input (as parsed from the "input" string)
and must return an array of arguments to pass to the solution function.
The __serialize function receives the solution's return value and must return a plain JSON value
(number, string, boolean, array, or object with no circular references) for comparison.

IMPORTANT: If the problem needs EXTRA CONSTRUCTION METADATA beyond the data structure values (e.g., cycle position for cycle detection, random pointer indices, parent node references), the __deserialize tuple type MUST include those extra parameters and test case inputs MUST provide them as named params. Example: __deserialize(input: [number[], number]) for [values, cyclePos], with test case: "input": "head = [3,2,0,-4], pos = 1".

Requirements:
- description: comprehensive, interview-quality problem statement in Markdown
- category: a single primary category (e.g., Arrays, Trees, Dynamic Programming)
- tags: at least 2 algorithm/data-structure tags
- constraints: realistic input constraints (3-6 items)
- inputFormat: clear description of function parameters
- outputFormat: clear description of expected return value
- examples: 2-3 worked examples with step-by-step explanations. Each explanation MUST include:
  1. An ASCII visual diagram showing the data structure state (for trees, linked lists, graphs, matrices, etc.)
  2. A step-by-step walkthrough of how the algorithm processes the input
  Example explanation for a tree problem:
  "The tree structure is:\\n      1\\n     / \\\\\\n    2   3\\n   / \\\\\\n  4   5\\n\\nInorder traversal visits: left(4) → root(2) → right(5) → root(1) → right(3)\\nResult: [4,2,5,1,3]"
  Example explanation for a linked list problem:
  "The linked list is: 1 → 2 → 3 → 4 → 5\\n\\nAfter reversing: 5 → 4 → 3 → 2 → 1\\nResult: [5,4,3,2,1]"
  For array/string problems, show the state changes at each key step.
  Use \\n for newlines within the explanation string.
- edgeCases: at least 2 edge cases with description, input, and expectedOutput
- testCases: 5-8 hidden test cases covering normal and edge scenarios
- timeComplexity / spaceComplexity: the expected optimal solution complexity in Big-O
- companyTags: 1-5 companies that ask this or similar questions
- boilerplate: ONLY the solution function signature with TODO comment (do NOT include class definitions or helpers here)
- harness: (only for data structure problems) class definitions + __deserialize + __serialize functions. Hidden from user, prepended at execution time.
- The problem must be solvable within 45 minutes in an interview setting

Respond with ONLY the JSON. No markdown fences, no extra text.`;
}

// ─── Generate Note ──────────────────────────────────────────────────────────

export interface GenerateNoteParams {
  solution: string;
  title: string;
  patterns: string[];
  difficulty: string;
  semanticDescription?: SemanticDescription;
}

export function buildGenerateNotePrompt(params: GenerateNoteParams): string {
  const semanticContext = formatSemanticContext(params.semanticDescription);

  return `You are a Staff Software Engineer helping a developer build their personal knowledge base.

The developer has just solved a coding problem. Based on their solution, generate a concise "Key Things to Remember" note they can save.

Problem: ${params.title}
Difficulty: ${params.difficulty}
Patterns: ${params.patterns.join(", ")}
${semanticContext ? `\n${semanticContext}\n` : ""}
Solution:
\`\`\`typescript
${params.solution}
\`\`\`

Generate a Markdown note with these sections:

## Key Insight
One sentence capturing the core idea that makes this solution work.

## Approach
2-4 bullet points describing the algorithm / data structure choice.

## Complexity
- Time: O(?)
- Space: O(?)

## Watch Out For
2-4 bullet points on common mistakes, edge cases, and gotchas.

## Pattern Recognition
When you see X in a problem, think of this approach. (1-2 sentences)

Keep it concise — this is for revision, not a tutorial. Write in plain Markdown.`;
}

// ─── Generate Variation ─────────────────────────────────────────────────────

export interface GenerateVariationParams {
  problemId: string;
  title: string;
  description: string;
  difficulty: string;
  patterns: string[];
  semanticDescription?: SemanticDescription;
  /** Existing variations to avoid generating duplicates */
  existingVariations?: { title: string; description: string; difficulty: string }[];
  /** When upgrading, the specific variation to replace */
  upgradeTarget?: { title: string; description: string; difficulty: string };
}

// ─── Generate Test Cases ────────────────────────────────────────────────────

export interface GenerateTestCasesParams {
  title: string;
  description: string;
  difficulty: string;
  patterns: string[];
  constraints: string[];
  inputFormat?: string;
  outputFormat?: string;
  boilerplate?: string;
  existingTestCases?: { input: string; expectedOutput: string }[];
  semanticDescription?: SemanticDescription;
}

export function buildGenerateTestCasesPrompt(
  params: GenerateTestCasesParams,
): string {
  const semanticContext = formatSemanticContext(params.semanticDescription);

  const existingSection = params.existingTestCases?.length
    ? `\nExisting Test Cases (do NOT duplicate these):\n${params.existingTestCases.slice(0, 10).map((tc, i) => `  ${i + 1}. Input: ${tc.input} → Expected: ${tc.expectedOutput}`).join("\n")}\n`
    : "";

  return `You are a senior software engineer and testing expert.

Generate a COMPREHENSIVE test suite covering ALL possible cases for this coding problem.
The goal is to ensure any correct solution passes all tests, and any buggy solution fails at least one test.

Problem: ${params.title}
Difficulty: ${params.difficulty}
Patterns: ${params.patterns.join(", ")}
${semanticContext ? `\n${semanticContext}\n` : ""}
Description:
${params.description.slice(0, 2000)}

Constraints: ${params.constraints.join("; ")}
${params.inputFormat ? `Input Format: ${params.inputFormat}` : ""}
${params.outputFormat ? `Output Format: ${params.outputFormat}` : ""}
${params.boilerplate ? `Function Signature:\n\`\`\`typescript\n${params.boilerplate}\n\`\`\`` : ""}
${existingSection}
Return ONLY a valid JSON object with categorized test cases:
{
  "categories": [
    {
      "name": "Basic Cases",
      "description": "Simple inputs that verify the core logic works",
      "testCases": [
        { "input": "...", "expectedOutput": "...", "explanation": "Tests basic functionality" }
      ]
    },
    {
      "name": "Edge Cases",
      "description": "Boundary conditions and special inputs",
      "testCases": [
        { "input": "...", "expectedOutput": "...", "explanation": "Tests empty input" }
      ]
    },
    {
      "name": "Large Inputs",
      "description": "Performance-relevant inputs near constraint limits",
      "testCases": [
        { "input": "...", "expectedOutput": "...", "explanation": "Tests O(n) vs O(n²) performance" }
      ]
    },
    {
      "name": "Corner Cases",
      "description": "Unusual but valid inputs that often trip up solutions",
      "testCases": [
        { "input": "...", "expectedOutput": "...", "explanation": "Tests duplicate elements" }
      ]
    }
  ]
}

CRITICAL: Test case format rules:
- "input" must match the function signature using named parameters.
  For \`isValid(s: string)\`, use: "input": "s = \\"()\\""
  For \`twoSum(nums: number[], target: number)\`, use: "input": "nums = [2,7,11,15], target = 9"
- For data structure problems, use the JSON representation that the boilerplate's __deserialize function expects.
  For \`reverseList(head: ListNode | null)\`, use: "input": "head = [1,2,3,4,5]"
  For \`inorderTraversal(root: TreeNode | null)\`, use: "input": "root = [1,null,2,3]" (level-order BFS)
  For graph problems with adjacency list: "input": "graph = [[1,2],[0,3],[0],[1]]"
- "expectedOutput" must be a valid JSON literal (the return value after __serialize):
  - Booleans: "true" or "false"
  - Numbers: "42"
  - Arrays: "[0,1]"
  - Strings: "\\"hello\\""
  - null: "null"
- When computing expectedOutput for tree problems, remember the input is level-order BFS:
  [3,1,4,null,2] → tree with root=3, left=1, right=4, 1.right=2.
  Always build the tree level-by-level from the array, then trace the algorithm.

Requirements:
- Generate 15-30 total test cases across all categories
- Categories must include at minimum: Basic Cases, Edge Cases, Large Inputs, Corner Cases
- You may add additional categories like: "Negative Cases", "Duplicate Handling", "Boundary Values", "Sorted/Unsorted Inputs", etc.
- Each test case MUST have a correct expectedOutput
- Each test case MUST have an explanation of what it's testing
- Cover ALL constraint boundaries (min/max values, empty inputs, single elements)
- Include at least 2 performance-stress cases (near constraint limits)
- Include at least 3 edge cases (empty, single element, all same, already sorted, etc.)
- Do NOT repeat any existing test cases listed above

Respond with ONLY the JSON. No markdown fences, no extra text.`;
}

export function buildGenerateVariationPrompt(
  params: GenerateVariationParams,
): string {
  const semanticContext = formatSemanticContext(params.semanticDescription);

  const existingSection = params.existingVariations?.length
    ? `\nAlready Generated Variations (DO NOT repeat these — create something distinctly different):\n${params.existingVariations.map((v, i) => `${i + 1}. "${v.title}" (${v.difficulty}) — ${v.description.slice(0, 200)}`).join("\n")}\n`
    : "";

  const upgradeSection = params.upgradeTarget
    ? `\nYou are UPGRADING this existing variation to be better and more challenging:\nTitle: ${params.upgradeTarget.title}\nDifficulty: ${params.upgradeTarget.difficulty}\nDescription: ${params.upgradeTarget.description.slice(0, 500)}\n\nMake it harder, more nuanced, or test a deeper aspect of the same pattern. Keep the core idea but significantly improve the quality.\n`
    : "";

  return `You are a senior software engineer creating coding problem variations for interview prep.
The output must be compatible with a timed coding interview module.

Based on this original problem, generate a VARIATION — a different problem that tests the same core pattern(s) but with a twist.

Original Problem: ${params.title}
Difficulty: ${params.difficulty}
Patterns: ${params.patterns.join(", ")}
${semanticContext ? `\n${semanticContext}\n` : ""}
Original Description:
${params.description.slice(0, 1500)}
${existingSection}${upgradeSection}
Generate a variation. The variation should:
- Test the same pattern(s) but with a different scenario or constraint
- Be a standalone problem (someone could solve it without seeing the original)
- Have a different difficulty level if appropriate (can be easier or harder)
- Include enough detail to be used directly in a coding interview session
${params.existingVariations?.length ? "- Be COMPLETELY DIFFERENT from the existing variations listed above\n" : ""}
Return ONLY a valid JSON object:
{
  "title": "Variation title",
  "description": "Full problem statement in Markdown — comprehensive, interview-quality",
  "difficulty": "easy" | "medium" | "hard",
  "category": "string - primary category e.g., Arrays, Trees, Dynamic Programming",
  "tags": ["string array - at least 2 relevant algorithm/data-structure tags"],
  "constraints": ["string array - realistic input constraints"],
  "inputFormat": "string - description of what the function receives",
  "outputFormat": "string - description of expected return value",
  "samples": [
    { "input": "...", "output": "...", "explanation": "step-by-step explanation" }
  ],
  "edgeCases": [
    { "description": "what edge case this tests", "input": "...", "expectedOutput": "..." }
  ],
  "testCases": [
    { "input": "...", "expectedOutput": "..." }
  ],
  "timeComplexity": "O(...)",
  "spaceComplexity": "O(...)",
  "boilerplate": "TypeScript solution function signature with TODO comment",
  "harness": "string (optional) - hidden class definitions + __deserialize + __serialize for data structure problems",
  "hint": "A one-line hint about the approach"
}

Requirements:
- description: clear, self-contained problem statement in Markdown
- category: a single primary category
- tags: at least 2 items
- constraints: 2-5 realistic constraints
- inputFormat / outputFormat: clear descriptions
- samples: at least 2 items with input, output, and explanation. Explanations MUST include ASCII visual diagrams for data structure problems (trees, linked lists, graphs) and step-by-step walkthroughs. Use \\n for newlines.
- edgeCases: at least 2 items
- testCases: at least 5 items covering various scenarios
- timeComplexity / spaceComplexity: valid Big-O notation
- boilerplate: ONLY the solution function signature (no class definitions or helpers)
- harness: (only for data structure problems) hidden code with class definitions + __deserialize + __serialize
- The variation must genuinely be different from the original (not just renaming variables)
- The problem must be solvable within 45 minutes

DATA STRUCTURE BOILERPLATE — HARNESS CONVENTION:
If the problem involves ANY custom data structure, the boilerplate MUST include:
1. Class definitions
2. A \`__deserialize(input)\` function: converts raw JSON test input into solution function arguments
3. A \`__serialize(output)\` function: converts solution's return value back to plain JSON for comparison

The execution engine calls: __deserialize(input) → solution(...args) → __serialize(output) → deepEqual(result, expectedOutput)

Example for linked list: include ListNode class + __deserialize that builds linked list from array + __serialize that converts linked list back to array.
Example for tree: include TreeNode class + __deserialize that builds tree from level-order BFS array + __serialize for the output format.
This pattern works for ANY data structure (graphs, tries, heaps, n-ary trees, etc.).

For test cases, use simple JSON arrays as inputs that __deserialize will convert:
- Linked list: "head = [1,2,3,4,5]"
- Tree (level-order BFS): "root = [3,1,4,null,2]"
- Graph adjacency: "graph = [[1,2],[0,3],[0],[1]]"

Respond with ONLY the JSON. No markdown fences.`;
}
