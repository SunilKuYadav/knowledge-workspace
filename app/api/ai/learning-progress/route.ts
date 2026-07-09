/**
 * API route for AI-powered learning progress analysis.
 *
 * POST handler accepts the user's current knowledge base data and experience level,
 * then streams back either:
 * - A readiness assessment comparing current coverage to target level requirements
 * - A study plan for uncovered/weak areas
 * - Suggested subtopics or problems to study next
 */

import { NextRequest, NextResponse } from "next/server";
import { createAIClient } from "@/ai";
import { composeWithConfig } from "@/src/ai/prompts/utils/compose";
import { MARKDOWN_CONTEXT } from "@/src/ai/prompts/system";
import { loadPromptConfig } from "@/src/ai/prompts/loadConfig";
import type { PromptConfig } from "@/types/PromptConfig";

const DEFAULT_BASE_URL =
  process.env.OPENAI_BASE_URL || "http://127.0.0.1:1234/v1";
const API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL = process.env.OPENAI_MODEL || "gpt-3.5-turbo";

type ActionType = "assess-readiness" | "generate-plan" | "suggest-topics" | "suggest-problems" | "ready-problems";

interface ProgressRequestBody {
  action: ActionType;
  category?: string;
  topicsSummary: string;
  problemsSummary: string;
  coverageStats: {
    totalTopics: number;
    completedTopics: number;
    inProgressTopics: number;
    avgConfidence: number;
    totalProblems: number;
    solvedProblems: number;
    attemptedProblems: number;
    easyCount: number;
    mediumCount: number;
    hardCount: number;
    patternsCovered: string[];
    categoriesCovered: string[];
  };
}

function buildProgressPrompt(
  body: ProgressRequestBody,
  config: PromptConfig,
): string {
  const { action, category, topicsSummary, problemsSummary, coverageStats } = body;

  const statsBlock = `## Current Learning State
- Experience Level: ${config.experienceLevel} YOE (targeting ${config.targetRole})
- Target Companies: ${config.targetCompanies.join(", ")}

### Topics Coverage
- Total Topics: ${coverageStats.totalTopics}
- Completed: ${coverageStats.completedTopics}
- In Progress: ${coverageStats.inProgressTopics}
- Not Started: ${coverageStats.totalTopics - coverageStats.completedTopics - coverageStats.inProgressTopics}
- Average Confidence: ${coverageStats.avgConfidence.toFixed(1)}/5
- Categories Covered: ${coverageStats.categoriesCovered.join(", ") || "None"}

### Problems Coverage
- Total Problems: ${coverageStats.totalProblems}
- Solved: ${coverageStats.solvedProblems}
- Attempted: ${coverageStats.attemptedProblems}
- Easy: ${coverageStats.easyCount} | Medium: ${coverageStats.mediumCount} | Hard: ${coverageStats.hardCount}
- Patterns Covered: ${coverageStats.patternsCovered.join(", ") || "None"}

### Topics in Knowledge Base
${topicsSummary || "No topics yet."}

### Problems in Knowledge Base
${problemsSummary || "No problems yet."}`;

  let task = "";

  switch (action) {
    case "assess-readiness":
      task = `${statsBlock}

## Assessment Request
Analyze the user's current learning state and provide a readiness assessment for their target level (${config.targetRole} at ${config.targetCompanies.join(", ")}).

Provide:
1. **Overall Readiness Score** — Rate 1-10 with clear justification.
2. **Strengths** — What areas are well-covered for the target level.
3. **Critical Gaps** — What's missing that would be expected at this level.
4. **Category Breakdown** — For each of DSA, System Design, Database, Networking, OS, OOP — rate coverage and identify gaps.
5. **Pattern Coverage** — Which algorithmic patterns are missing for the target interview bar.
6. **Difficulty Distribution Analysis** — Is the easy/medium/hard ratio appropriate for the target level.
7. **Recommendation** — Is the user ready to move to the next level? Clear yes/no with reasoning.

Be honest and specific. Reference actual expectations for ${config.targetRole} interviews.`;
      break;

    case "generate-plan":
      task = `${statsBlock}

## Study Plan Request
${category ? `Focus area: ${category}` : "Generate a comprehensive study plan covering all weak areas."}

Generate a structured study plan to fill the gaps for ${config.targetRole} preparation:

1. **Priority Areas** — Ordered by importance for the target level interviews.
2. **Weekly Plan** — A realistic 4-6 week plan with specific daily/weekly goals.
3. **Topics to Add** — Specific subtopics the user should study (that aren't in their knowledge base yet).
4. **Problems to Solve** — Types of problems to practice, with recommended difficulty progression.
5. **Pattern Focus** — Which algorithmic patterns need more practice.
6. **Milestones** — Clear checkpoints to assess progress.
7. **Time Estimates** — Realistic hours per topic/area.

Calibrate difficulty and depth to ${config.experienceLevel} YOE targeting ${config.targetRole}. Be specific and actionable.`;
      break;

    case "suggest-topics":
      task = `${statsBlock}

## Topic Suggestions Request
${category ? `Category: ${category}` : "Across all categories."}

Based on the user's current knowledge base and their target level (${config.targetRole}), suggest subtopics they should study next.

For each suggestion provide:
- **Title** — Clear, specific subtopic name
- **Category** — Which category it belongs to (dsa, system-design, database, networking, os, oop)
- **Why** — Why this is important for their target level
- **Priority** — High/Medium/Low for interview preparation
- **Prerequisites** — What they should know first (reference existing topics if applicable)
- **Estimated Time** — Hours to study thoroughly

Suggest 8-12 topics, ordered by priority. Focus on gaps that would be tested at ${config.targetRole} interviews.`;
      break;

    case "suggest-problems":
      task = `${statsBlock}

## Problem Suggestions Request
${category ? `Focus pattern/category: ${category}` : "Across all patterns."}

Based on the user's current problem set and target level (${config.targetRole}), suggest coding problems they should practice.

For each suggestion provide:
- **Title** — Problem name (use well-known problems from LeetCode/similar)
- **Pattern** — The algorithmic pattern it tests
- **Difficulty** — Easy/Medium/Hard
- **Why** — Why this problem is important for their target level
- **Companies** — Which target companies frequently ask this type
- **Prerequisite Topics** — What concepts they should understand first

Suggest 10-15 problems, ordered by priority. Focus on patterns that are:
1. Missing from their current problem set
2. Frequently tested at ${config.targetCompanies.join(", ")} for ${config.targetRole}
3. Appropriate difficulty progression for ${config.experienceLevel} YOE`;
      break;

    case "ready-problems":
      task = `${statsBlock}

## Ready-to-Attempt Problems Request
${category ? `Focus pattern/category: ${category}` : "Across all patterns."}

Based on the user's COMPLETED topics (confidence >= 3) and their existing problem set, identify problems they are NOW READY to attempt.

The key insight: match completed topics to problem patterns. If a user has studied "Hash Tables" with confidence 4/5 and "Arrays" with confidence 3/5, they're ready for "Two Sum" (hash map + arrays).

Provide:
1. **Ready Now** — Problems they should be able to solve given their current knowledge. For each:
   - Title, Pattern, Difficulty, Why they're ready (cite specific topics they've mastered)
2. **Almost Ready** — Problems they're close to being ready for, with what's missing:
   - Title, Pattern, Missing prerequisite (what to study next to unlock this)
3. **Level-Up Path** — The 3-5 topics that would unlock the most problems if completed next

Format as clear Markdown with sections. Be specific about which completed topics map to which problems.`;
      break;
  }

  return composeWithConfig({
    actionKeys: ["identity", "teaching"],
    extraModules: [MARKDOWN_CONTEXT],
    task,
    config,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ProgressRequestBody;

    if (!body.action) {
      return NextResponse.json(
        { error: "Missing required field: action" },
        { status: 400 },
      );
    }

    const config = await loadPromptConfig();
    const client = createAIClient({
      baseUrl: DEFAULT_BASE_URL,
      apiKey: API_KEY,
      defaultModel: MODEL,
    });

    const available = await client.isAvailable();
    if (!available) {
      return NextResponse.json(
        { error: "AI service is currently unavailable" },
        { status: 503 },
      );
    }

    const systemPrompt = buildProgressPrompt(body, config);

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of client.generate(systemPrompt)) {
            controller.enqueue(new TextEncoder().encode(chunk));
          }
          controller.close();
        } catch {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
