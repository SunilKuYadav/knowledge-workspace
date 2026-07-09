/**
 * Learning progress prompt builders.
 *
 * Produces prompts for AI-powered learning progress analysis:
 * readiness assessment, study plans, topic/problem suggestions.
 */

import { composeWithConfig } from "../utils/compose";
import { MARKDOWN_CONTEXT } from "../system/markdown";
import type { PromptConfig } from "@/types/PromptConfig";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ProgressAction =
  | "assess-readiness"
  | "generate-plan"
  | "suggest-topics"
  | "suggest-problems"
  | "ready-problems";

export interface CoverageStats {
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
}

export interface LearningProgressParams {
  action: ProgressAction;
  category?: string;
  topicsSummary: string;
  problemsSummary: string;
  coverageStats: CoverageStats;
  config: PromptConfig;
}

// ─── Prompt Builder ─────────────────────────────────────────────────────────

/**
 * Builds a prompt for learning progress analysis.
 * Supports: readiness assessment, study plan generation, topic/problem suggestions.
 */
export function buildLearningProgressPrompt(
  params: LearningProgressParams,
): string {
  const { action, category, topicsSummary, problemsSummary, coverageStats, config } =
    params;

  const statsBlock = buildStatsBlock(
    topicsSummary,
    problemsSummary,
    coverageStats,
    config,
  );

  const task = buildActionTask(action, statsBlock, category, config);

  return composeWithConfig({
    actionKeys: ["identity", "teaching"],
    extraModules: [MARKDOWN_CONTEXT],
    task,
    config,
  });
}

// ─── Private ────────────────────────────────────────────────────────────────

function buildStatsBlock(
  topicsSummary: string,
  problemsSummary: string,
  stats: CoverageStats,
  config: PromptConfig,
): string {
  return `## Current Learning State
- Experience Level: ${config.experienceLevel} YOE (targeting ${config.targetRole})
- Target Companies: ${config.targetCompanies.join(", ")}

### Topics Coverage
- Total Topics: ${stats.totalTopics}
- Completed: ${stats.completedTopics}
- In Progress: ${stats.inProgressTopics}
- Not Started: ${stats.totalTopics - stats.completedTopics - stats.inProgressTopics}
- Average Confidence: ${stats.avgConfidence.toFixed(1)}/5
- Categories Covered: ${stats.categoriesCovered.join(", ") || "None"}

### Problems Coverage
- Total Problems: ${stats.totalProblems}
- Solved: ${stats.solvedProblems}
- Attempted: ${stats.attemptedProblems}
- Easy: ${stats.easyCount} | Medium: ${stats.mediumCount} | Hard: ${stats.hardCount}
- Patterns Covered: ${stats.patternsCovered.join(", ") || "None"}

### Topics in Knowledge Base
${topicsSummary || "No topics yet."}

### Problems in Knowledge Base
${problemsSummary || "No problems yet."}`;
}

function buildActionTask(
  action: ProgressAction,
  statsBlock: string,
  category: string | undefined,
  config: PromptConfig,
): string {
  switch (action) {
    case "assess-readiness":
      return buildAssessReadinessTask(statsBlock, config);
    case "generate-plan":
      return buildGeneratePlanTask(statsBlock, category, config);
    case "suggest-topics":
      return buildSuggestTopicsTask(statsBlock, category, config);
    case "suggest-problems":
      return buildSuggestProblemsTask(statsBlock, category, config);
    case "ready-problems":
      return buildReadyProblemsTask(statsBlock, category, config);
  }
}

function buildAssessReadinessTask(
  statsBlock: string,
  config: PromptConfig,
): string {
  return `${statsBlock}

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
}

function buildGeneratePlanTask(
  statsBlock: string,
  category: string | undefined,
  config: PromptConfig,
): string {
  return `${statsBlock}

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
}

function buildSuggestTopicsTask(
  statsBlock: string,
  category: string | undefined,
  config: PromptConfig,
): string {
  return `${statsBlock}

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
}

function buildSuggestProblemsTask(
  statsBlock: string,
  category: string | undefined,
  config: PromptConfig,
): string {
  return `${statsBlock}

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
}

function buildReadyProblemsTask(
  statsBlock: string,
  category: string | undefined,
  config: PromptConfig,
): string {
  return `${statsBlock}

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
}
