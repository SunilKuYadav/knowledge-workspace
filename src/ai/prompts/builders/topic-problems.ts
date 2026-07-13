/**
 * Topic-based problem generation prompt builders.
 *
 * Centralizes prompts previously inline in:
 * - app/api/ai/topic/suggest-problems/route.ts
 * - app/api/ai/topic/generate-problem/route.ts
 */

import type { SemanticDescription } from "@/types";
import { formatSemanticContext } from "../utils/format";

// ─── Suggest Problems ───────────────────────────────────────────────────────

export interface SuggestProblemsParams {
  topicId: string;
  topicTitle: string;
  category: string;
  tags: string[];
  difficulty: string;
  artifactContent: string;
  semanticDescription?: SemanticDescription;
}

export function buildSuggestProblemsPrompt(
  params: SuggestProblemsParams,
  experienceLevel: number,
  targetRole: string,
): string {
  const levelContext = experienceLevel === 1
    ? "Target: Junior/Mid engineer (L3/L4). Suggest problems that build foundational understanding — brute-force is acceptable. Focus on the most commonly asked easy-to-medium problems."
    : experienceLevel === 5
      ? `Target: Senior engineer (${targetRole || "L4/L5"}). Suggest problems requiring pattern recognition, efficient solutions, and solid edge case awareness.`
      : experienceLevel === 10
        ? `Target: Staff engineer (${targetRole || "L5/L6"}). Suggest problems that test optimization, advanced data structures, and algorithmic depth.`
        : `Target: Principal engineer (${targetRole || "L6/L7"}). Suggest challenging problems requiring elegant solutions, deep algorithmic insight, and creative approaches.`;

  const semanticContext = params.semanticDescription
    ? `\nLearning context: ${params.semanticDescription.intent || ""}\nFocus areas: ${params.semanticDescription.focus?.join(", ") || "general"}\nTarget level: ${params.semanticDescription.targetLevel || "default"}`
    : "";

  // Truncate artifact content to keep prompt manageable
  const content = params.artifactContent.slice(0, 6000);

  return `You are an expert coding interview coach. Based on the following topic content, suggest 5-8 coding problems that would help a user practice and master this SPECIFIC topic.

CRITICAL: Every problem you suggest MUST directly test concepts, techniques, or patterns from the topic "${params.topicTitle}" (${params.category}). Do NOT suggest generic problems. Each problem must require applying knowledge from this topic to solve it.

${levelContext}
${semanticContext}

Topic: ${params.topicTitle}
Category: ${params.category}
Tags: ${params.tags.join(", ")}
Difficulty: ${params.difficulty}

Topic Content (use this to identify the specific concepts, algorithms, and patterns to test):
${content}

For each problem, provide:
1. A clear, concise title (like you'd see on LeetCode)
2. Difficulty (easy/medium/hard) — mix difficulties appropriately for the target level
3. A 1-2 sentence problem description
4. Relevant patterns/techniques from THIS topic that it tests
5. Companies known to ask similar problems
6. A brief rationale explaining EXACTLY which concept from the topic content above this problem exercises

Return ONLY a valid JSON array with this structure:
[
  {
    "title": "Problem Title",
    "difficulty": "easy" | "medium" | "hard",
    "description": "Brief problem description",
    "patterns": ["pattern1", "pattern2"],
    "companies": ["Google", "Meta"],
    "rationale": "Tests [specific concept from topic]: [why this problem requires it]"
  }
]

Guidelines:
- EVERY problem must directly exercise concepts found in the topic content above
- Reference specific algorithms, data structures, or techniques mentioned in the topic
- Include a progression: start with problems that test individual concepts, then combine them
- Prefer problems commonly asked at FAANG companies
- Each problem should test a DISTINCT aspect of the topic — no overlap
- Be specific — "Two Sum" not "Array problem"
- The rationale MUST reference a specific concept from the topic content

Respond with ONLY the JSON array.`;
}

// ─── Generate Problem From Topic ────────────────────────────────────────────

export interface GenerateProblemFromTopicParams {
  title: string;
  difficulty: string;
  description: string;
  patterns: string[];
  topicTitle: string;
  topicCategory: string;
  artifactContent: string;
}

export function buildGenerateProblemFromTopicPrompt(
  params: GenerateProblemFromTopicParams,
  experienceLevel: number,
): string {
  const levelHint = experienceLevel === 1
    ? "Design the problem for a junior engineer. Include clear input/output formats, simple constraints, and a straightforward boilerplate. Examples should be easy to follow."
    : experienceLevel === 5
      ? "Design for a senior engineer. Include non-trivial edge cases, meaningful constraints, and expect optimal solutions."
      : experienceLevel >= 10
        ? "Design for a staff+ engineer. Include challenging edge cases, tight constraints that require optimal approaches, and test cases that catch subtle bugs."
        : "Design for an experienced engineer.";

  const topicContent = params.artifactContent.slice(0, 3000);

  return `You are an expert at creating LeetCode-style coding problems. Generate a complete, well-structured coding problem based on this specification.

Problem: ${params.title}
Difficulty: ${params.difficulty}
Brief: ${params.description}
Patterns: ${params.patterns.join(", ")}
Topic Context: ${params.topicTitle} (${params.topicCategory})

${levelHint}

Related topic content for context:
${topicContent}

Return ONLY a valid JSON object with this exact structure:
{
  "title": "${params.title}",
  "difficulty": "${params.difficulty}",
  "description": "Full problem statement in markdown. Include the problem narrative, input/output description, and any special conditions.",
  "constraints": ["constraint 1", "constraint 2", ...],
  "examples": [
    { "input": "formatted input string", "expectedOutput": "expected output", "explanation": "step-by-step explanation" }
  ],
  "testCases": [
    { "input": "test input", "expectedOutput": "expected output" }
  ],
  "boilerplate": "function solutionName(params: types): returnType {\\n  // Your solution here\\n}",
  "timeComplexity": "O(...)",
  "spaceComplexity": "O(...)",
  "patterns": ${JSON.stringify(params.patterns)}
}

Requirements:
- Provide 2-3 examples with clear explanations
- Provide 5-8 test cases covering edge cases, typical cases, and boundary conditions
- The boilerplate should be TypeScript with proper types
- Input/output formats should be parseable (use JSON-like format for arrays/objects)
- Constraints should be specific (e.g., "1 <= nums.length <= 10^5")
- Description should be clear, complete, and unambiguous

Respond with ONLY the JSON.`;
}
