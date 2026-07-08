/**
 * Problem-specific prompt builders.
 *
 * Centralizes all prompts previously inline in:
 * - app/api/ai/problem/generate-description/route.ts
 * - app/api/ai/problem/generate-note/route.ts
 * - app/api/ai/problem/generate-variation/route.ts
 */

// ─── Generate Description ───────────────────────────────────────────────────

export interface GenerateDescriptionParams {
  problemId: string;
  title: string;
  difficulty: string;
  patterns: string[];
  companies: string[];
  url?: string;
}

export function buildGenerateDescriptionPrompt(
  params: GenerateDescriptionParams,
): string {
  return `You are a senior software engineer and coding interview expert.

Generate a complete problem description for the following LeetCode-style coding problem.
The output must be compatible with both a problem workspace and a timed coding interview module.

Problem Title: ${params.title}
Difficulty: ${params.difficulty}
Patterns: ${params.patterns.join(", ")}
Companies: ${params.companies.join(", ") || "Not specified"}
${params.url ? `Original URL: ${params.url}` : ""}

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
}

export function buildGenerateNotePrompt(params: GenerateNoteParams): string {
  return `You are a Staff Software Engineer helping a developer build their personal knowledge base.

The developer has just solved a coding problem. Based on their solution, generate a concise "Key Things to Remember" note they can save.

Problem: ${params.title}
Difficulty: ${params.difficulty}
Patterns: ${params.patterns.join(", ")}

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
}

export function buildGenerateVariationPrompt(
  params: GenerateVariationParams,
): string {
  return `You are a senior software engineer creating coding problem variations for interview prep.
The output must be compatible with a timed coding interview module.

Based on this original problem, generate a VARIATION — a different problem that tests the same core pattern(s) but with a twist.

Original Problem: ${params.title}
Difficulty: ${params.difficulty}
Patterns: ${params.patterns.join(", ")}

Original Description:
${params.description.slice(0, 1500)}

Generate a variation. The variation should:
- Test the same pattern(s) but with a different scenario or constraint
- Be a standalone problem (someone could solve it without seeing the original)
- Have a different difficulty level if appropriate (can be easier or harder)
- Include enough detail to be used directly in a coding interview session

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
