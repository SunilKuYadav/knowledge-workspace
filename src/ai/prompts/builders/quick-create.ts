/**
 * Quick-create metadata prompt builders.
 *
 * Produces prompts for AI-enriched metadata generation when
 * quick-creating topics or problems from study plans.
 */

import { composeWithConfig } from "../utils/compose";
import { JSON_CONTEXT } from "../system/json";
import type { PromptConfig } from "@/types/PromptConfig";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PlanContext {
  title?: string;
  description?: string;
  category?: string | null;
  reason?: string;
  content?: string;
}

export interface QuickCreateMetadataParams {
  type: "topic" | "problem";
  title: string;
  planContext?: PlanContext;
  config: PromptConfig;
}

// ─── Prompt Builder ─────────────────────────────────────────────────────────

/**
 * Builds a prompt for generating AI-enriched metadata for a new topic or problem.
 */
export function buildQuickCreateMetadataPrompt(
  params: QuickCreateMetadataParams,
): string {
  const { type, title, planContext, config } = params;

  const task =
    type === "topic"
      ? buildTopicMetadataTask(title, planContext, config)
      : buildProblemMetadataTask(title, planContext, config);

  return composeWithConfig({
    actionKeys: ["identity", "interview"],
    extraModules: [JSON_CONTEXT],
    task,
    config,
  });
}

// ─── Private ────────────────────────────────────────────────────────────────

function buildPlanSection(planContext?: PlanContext): string {
  if (!planContext) return "";
  return `
## Study Plan Context
- Plan Title: ${planContext.title || "N/A"}
- Plan Description: ${planContext.description || "N/A"}
- Plan Category: ${planContext.category || "General"}
- Item Reason: ${planContext.reason || "N/A"}
${planContext.content ? `- Plan Content (excerpt): ${planContext.content.slice(0, 1500)}` : ""}`;
}

function getTargetLevel(experienceLevel: number): string {
  if (experienceLevel <= 1) return "beginner";
  if (experienceLevel <= 5) return "intermediate";
  if (experienceLevel <= 10) return "senior";
  return "staff";
}

function buildTopicMetadataTask(
  title: string,
  planContext: PlanContext | undefined,
  config: PromptConfig,
): string {
  const planSection = buildPlanSection(planContext);
  const targetLevel = getTargetLevel(config.experienceLevel);

  return `Generate metadata for a study topic.

## User Context
- Experience Level: ${config.experienceLevel} YOE
- Target Role: ${config.targetRole}
- Target Companies: ${config.targetCompanies.join(", ")}

## Topic to Create
Title: "${title}"
${planSection}

## Your Task
Generate metadata JSON for this topic. Infer the best values based on the title and plan context.

Return ONLY valid JSON:
{
  "category": "dsa" | "system-design" | "database" | "networking" | "os" | "oop",
  "difficulty": "easy" | "medium" | "hard",
  "tags": ["array of 3-6 relevant tags like algorithm names, concepts, techniques"],
  "estimatedMinutes": number (realistic study time for this topic at the user's level),
  "semanticDescription": {
    "intent": "what the user should get from studying this (1-2 sentences calibrated for ${config.experienceLevel} YOE)",
    "targetLevel": "${targetLevel}",
    "context": "why this topic matters for ${config.targetRole} interviews (1 sentence)",
    "focus": ["2-4 focus areas relevant for this level, e.g. 'implementation', 'interview', 'production'"]
  }
}

Rules:
- Category must be one of: dsa, system-design, database, networking, os, oop
- Tags should be specific and useful for filtering (e.g., "binary-search", "divide-and-conquer", not "algorithms")
- Estimated minutes should reflect realistic study time for ${config.experienceLevel} YOE (beginners need more time)
- Semantic description should be calibrated for the user's experience level
- Return ONLY the JSON object, nothing else`;
}

function buildProblemMetadataTask(
  title: string,
  planContext: PlanContext | undefined,
  config: PromptConfig,
): string {
  const planSection = buildPlanSection(planContext);
  const targetLevel = getTargetLevel(config.experienceLevel);

  return `Generate metadata for a coding problem.

## User Context
- Experience Level: ${config.experienceLevel} YOE
- Target Role: ${config.targetRole}
- Target Companies: ${config.targetCompanies.join(", ")}

## Problem to Create
Title: "${title}"
${planSection}

## Your Task
Generate metadata JSON for this problem. Infer the best values based on the title and plan context.

Return ONLY valid JSON:
{
  "difficulty": "easy" | "medium" | "hard",
  "patterns": ["array of 2-4 algorithmic patterns like 'two-pointers', 'dynamic-programming', 'sliding-window'"],
  "companies": ["array of 2-5 companies known to ask this or similar problems"],
  "frequency": "very-high" | "high" | "medium" | "low",
  "timeComplexity": "O(1)" | "O(log n)" | "O(n)" | "O(n log n)" | "O(n²)" | "O(2ⁿ)" | "O(n!)",
  "spaceComplexity": "O(1)" | "O(log n)" | "O(n)" | "O(n log n)" | "O(n²)" | "O(2ⁿ)" | "O(n!)",
  "semanticDescription": {
    "intent": "what practicing this problem teaches (1-2 sentences calibrated for ${config.experienceLevel} YOE)",
    "targetLevel": "${targetLevel}",
    "context": "why this problem matters for ${config.targetRole} interviews (1 sentence)",
    "focus": ["2-4 focus areas, e.g. 'edge-cases', 'optimization', 'clean-code', 'follow-up-variations'"]
  }
}

Rules:
- Patterns should be specific algorithm/data-structure patterns (not generic like "arrays")
- Companies should be realistic FAANG/MAANG companies known for this type of problem
- Frequency should reflect how often this appears in real interviews at ${config.targetCompanies.join("/")}
- Time/space complexity should reflect the OPTIMAL solution
- Semantic description should be calibrated for the user's experience level
- Return ONLY the JSON object, nothing else`;
}
