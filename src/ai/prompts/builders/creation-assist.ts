/**
 * AI-assisted creation prompt builders.
 *
 * These prompts power intelligent topic and problem creation:
 * - Auto-suggest prerequisites and related topics
 * - Generate skeleton overviews with relevant section structure
 * - Link problems to existing topics
 * - Assess readiness for a problem based on current knowledge
 */

import { composePrompt } from "../utils/compose";
import { IDENTITY_CONTEXT } from "../system/identity";
import { TEACHING_CONTEXT } from "../system/teaching";
import { JSON_CONTEXT } from "../system/json";

// ─── Topic Creation Assist ──────────────────────────────────────────────────

export interface TopicCreationAssistParams {
  title: string;
  category: string;
  difficulty: string;
  tags: string[];
  /** Existing topic IDs and titles for prerequisite/related suggestions. */
  existingTopics: Array<{ id: string; title: string; category: string }>;
}

/**
 * Builds a prompt that suggests prerequisites, related topics, estimated time,
 * and a skeleton overview for a new topic being created.
 */
export function buildTopicCreationAssistPrompt(
  params: TopicCreationAssistParams,
): string {
  const existingList = params.existingTopics
    .map((t) => `- "${t.title}" (id: ${t.id}, category: ${t.category})`)
    .join("\n");

  return composePrompt({
    modules: [IDENTITY_CONTEXT, TEACHING_CONTEXT, JSON_CONTEXT],
    task: `The user is creating a new topic in their knowledge workspace. Help them by suggesting prerequisites, related topics, estimated study time, and a skeleton overview.

## New Topic Being Created
- Title: ${params.title}
- Category: ${params.category}
- Difficulty: ${params.difficulty}
- Tags: ${params.tags.join(", ") || "none"}

## Existing Topics in Workspace
${existingList || "No existing topics yet."}

## Your Task
Return a JSON object with:
1. "prerequisites" — array of topic IDs from the existing list that should be understood before studying this topic. Only include topics that are genuine prerequisites. If none apply, use an empty array.
2. "relatedTopics" — array of topic IDs from the existing list that are conceptually related or naturally studied alongside this topic.
3. "suggestedPrerequisites" — array of topic titles (strings) that SHOULD exist but DON'T yet. These are concepts the user should consider adding to their workspace.
4. "estimatedMinutes" — estimated total study time in minutes for this topic at a thorough level.
5. "overview" — a skeleton overview in Markdown with section headers relevant to the category. Include brief (1-2 sentence) descriptions under each header indicating what to cover. Do NOT write the full content — just the structure.

Return ONLY valid JSON:
{
  "prerequisites": ["existing-topic-id-1"],
  "relatedTopics": ["existing-topic-id-2"],
  "suggestedPrerequisites": ["Topic Title That Should Exist"],
  "estimatedMinutes": 120,
  "overview": "# Topic Title\\n\\n## Core Concept\\nWhat this is and why it matters.\\n\\n## Key Operations\\n..."
}

Important:
- Only reference IDs from the existing topics list for prerequisites/relatedTopics.
- The overview should be category-appropriate (DSA topics need different sections than System Design topics).
- Be realistic with time estimates based on difficulty and breadth.`,
  });
}

// ─── Problem Creation Assist ────────────────────────────────────────────────

export interface ProblemCreationAssistParams {
  title: string;
  platform: string;
  difficulty: string;
  patterns: string[];
  companies: string[];
  /** Existing topics for linking. */
  existingTopics: Array<{ id: string; title: string; category: string }>;
  /** Existing problems for context. */
  existingProblems: Array<{ id: string; title: string; patterns: string[]; difficulty: string }>;
}

/**
 * Builds a prompt that suggests related topic IDs, similar problems,
 * and a readiness assessment for a new problem being created.
 */
export function buildProblemCreationAssistPrompt(
  params: ProblemCreationAssistParams,
): string {
  const topicsList = params.existingTopics
    .map((t) => `- "${t.title}" (id: ${t.id}, category: ${t.category})`)
    .join("\n");

  const problemsList = params.existingProblems
    .slice(0, 30) // Limit to avoid token overflow
    .map((p) => `- "${p.title}" (id: ${p.id}, patterns: ${p.patterns.join(", ")}, ${p.difficulty})`)
    .join("\n");

  return composePrompt({
    modules: [IDENTITY_CONTEXT, JSON_CONTEXT],
    task: `The user is adding a new coding problem to their workspace. Help them by suggesting related topics, similar problems, and assessing if they're ready for this problem.

## New Problem Being Created
- Title: ${params.title}
- Platform: ${params.platform}
- Difficulty: ${params.difficulty}
- Patterns: ${params.patterns.join(", ") || "not specified"}
- Companies: ${params.companies.join(", ") || "not specified"}

## Existing Topics in Workspace
${topicsList || "No existing topics yet."}

## Existing Problems in Workspace
${problemsList || "No existing problems yet."}

## Your Task
Return a JSON object with:
1. "relatedTopicIds" — array of topic IDs from the existing topics that are directly relevant to solving this problem.
2. "suggestedTopics" — array of topic titles (strings) the user should study before attempting this problem, that DON'T exist in their workspace yet.
3. "similarProblemIds" — array of problem IDs from existing problems that are similar in pattern or concept.
4. "readinessAssessment" — a brief assessment: is the user likely ready for this problem based on their existing topics? Include which prerequisites they have vs. are missing.
5. "suggestedPatterns" — if the user didn't specify patterns, suggest what patterns this problem likely uses.

Return ONLY valid JSON:
{
  "relatedTopicIds": ["topic-id-1", "topic-id-2"],
  "suggestedTopics": ["Topic They Should Study First"],
  "similarProblemIds": ["problem-id-1"],
  "readinessAssessment": "You have studied X which covers Y. You may want to study Z before attempting this.",
  "suggestedPatterns": ["two-pointers", "hash-map"]
}

Important:
- Only reference IDs that actually exist in the lists above.
- Be honest about readiness — if they lack fundamental topics, say so.
- suggestedPatterns should only be filled if the user didn't provide patterns.`,
  });
}

// ─── Study Plan Generation ──────────────────────────────────────────────────

export interface StudyPlanGenerationParams {
  category?: string;
  timelineWeeks?: number;
  topicsSummary: string;
  problemsSummary: string;
  coverageStats: {
    totalTopics: number;
    completedTopics: number;
    avgConfidence: number;
    totalProblems: number;
    solvedProblems: number;
    patternsCovered: string[];
  };
  experienceLevel: number;
  targetRole: string;
  targetCompanies: string[];
}

/**
 * Builds a prompt that generates a structured, persistable study plan
 * with specific items (topics and problems) to complete.
 */
export function buildStudyPlanPrompt(params: StudyPlanGenerationParams): string {
  return composePrompt({
    modules: [IDENTITY_CONTEXT, TEACHING_CONTEXT, JSON_CONTEXT],
    task: `Generate a structured study plan for interview preparation.

## User Context
- Experience Level: ${params.experienceLevel} YOE
- Target Role: ${params.targetRole}
- Target Companies: ${params.targetCompanies.join(", ")}
${params.category ? `- Focus Category: ${params.category}` : "- Focus: Comprehensive (all categories)"}
${params.timelineWeeks ? `- Target Timeline: ${params.timelineWeeks} weeks` : "- Timeline: Suggest an appropriate timeline"}

## Current State
- Topics: ${params.coverageStats.totalTopics} total, ${params.coverageStats.completedTopics} completed, avg confidence ${params.coverageStats.avgConfidence.toFixed(1)}/5
- Problems: ${params.coverageStats.totalProblems} total, ${params.coverageStats.solvedProblems} solved
- Patterns Covered: ${params.coverageStats.patternsCovered.join(", ") || "None yet"}

### Existing Topics
${params.topicsSummary || "None yet."}

### Existing Problems
${params.problemsSummary || "None yet."}

## Your Task
Generate a study plan. Return a JSON object:
{
  "title": "Plan title (e.g., '4-Week DSA Intensive' or 'System Design Deep Dive')",
  "description": "1-2 sentence description of the plan's goal",
  "category": "${params.category || "null"} (null for comprehensive plans)",
  "timelineWeeks": number,
  "items": [
    {
      "id": "unique-slug-id",
      "type": "topic" or "problem",
      "title": "Item title",
      "completed": false,
      "reason": "Why this item is included",
      "estimatedMinutes": 60,
      "priority": "high" | "medium" | "low"
    }
  ],
  "content": "Full study plan in Markdown format with:\n- Weekly breakdown\n- Daily targets\n- Milestones\n- Tips for each section\n- How to know when you're ready to move on"
}

Requirements:
- Include 15-30 items, ordered by recommended study sequence.
- Mix topics and problems (roughly 40% topics, 60% problems).
- High-priority items should come first.
- Each item should have a clear reason for inclusion.
- The content field should be a comprehensive Markdown study guide.
- Focus on gaps — don't repeat what the user has already completed.
- Be realistic with time estimates.
- For problems: use well-known LeetCode-style problem names.
- For topics: use specific subtopic names (e.g., "Trie Operations" not just "Trees").

Return ONLY valid JSON.`,
  });
}
