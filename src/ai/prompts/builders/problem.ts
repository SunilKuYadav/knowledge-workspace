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
  "boilerplate": "function twoSum(nums: number[], target: number): number[] {\\n  // Your code here\\n}"
}

CRITICAL: Test case format rules (examples, edgeCases, testCases):
- "input" must match the boilerplate function signature using named parameters.
  For a function like \`isValid(s: string)\`, use: "input": "s = \\"()\\""
  For a function like \`twoSum(nums: number[], target: number)\`, use: "input": "nums = [2,7,11,15], target = 9"
- "expectedOutput" must be a valid JSON literal representing the return value:
  - Booleans: "true" or "false" (not "True", "False")
  - Numbers: "42", "3.14"
  - Arrays: "[0,1]", "[[1,2],[3,4]]"
  - Strings: "\\"hello\\""  (JSON-escaped string)
  - null: "null"
- Do NOT wrap string inputs in extra quotes. For a string parameter, use: s = \\"()\\" not s = "()"
- Do NOT include variable assignment syntax in expectedOutput. Just the value.

Requirements:
- description: comprehensive, interview-quality problem statement in Markdown
- category: a single primary category (e.g., Arrays, Trees, Dynamic Programming)
- tags: at least 2 algorithm/data-structure tags
- constraints: realistic input constraints (3-6 items)
- inputFormat: clear description of function parameters
- outputFormat: clear description of expected return value
- examples: 2-3 worked examples with step-by-step explanations
- edgeCases: at least 2 edge cases with description, input, and expectedOutput
- testCases: 5-8 hidden test cases covering normal and edge scenarios
- timeComplexity / spaceComplexity: the expected optimal solution complexity in Big-O
- companyTags: 1-5 companies that ask this or similar questions
- boilerplate: TypeScript function signature with a TODO comment
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
- "expectedOutput" must be a valid JSON literal (the return value):
  - Booleans: "true" or "false"
  - Numbers: "42"
  - Arrays: "[0,1]"
  - Strings: "\\"hello\\""
  - null: "null"

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
  "boilerplate": "TypeScript function signature with TODO comment",
  "hint": "A one-line hint about the approach"
}

Requirements:
- description: clear, self-contained problem statement in Markdown
- category: a single primary category
- tags: at least 2 items
- constraints: 2-5 realistic constraints
- inputFormat / outputFormat: clear descriptions
- samples: at least 2 items with input, output, and explanation
- edgeCases: at least 2 items
- testCases: at least 5 items covering various scenarios
- timeComplexity / spaceComplexity: valid Big-O notation
- boilerplate: valid TypeScript code with a clear function signature
- The variation must genuinely be different from the original (not just renaming variables)
- The problem must be solvable within 45 minutes

Respond with ONLY the JSON. No markdown fences.`;
}
