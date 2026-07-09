/**
 * POST /api/quick-create
 *
 * Quick-creates a topic or problem with AI-enriched metadata.
 * Uses the study plan context + user's experience level to generate
 * proper tags, patterns, difficulty, companies, semantic description, etc.
 *
 * Body: {
 *   type: "topic" | "problem",
 *   title: string,
 *   category?: string,
 *   difficulty?: string,
 *   patterns?: string[],
 *   companies?: string[],
 *   planContext?: { title, description, category, reason, content? }
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { getWorkspacePath } from "@/src/lib/constants";
import { FileTopicRepository } from "@/src/filesystem/FileTopicRepository";
import { FileProblemRepository } from "@/src/filesystem/FileProblemRepository";
import { getReadyClient } from "@/ai";
import { loadPromptConfig } from "@/src/ai/prompts/loadConfig";
import type { Topic, Problem, SemanticDescription } from "@/src/types";
import type { PromptConfig } from "@/types/PromptConfig";

interface PlanContext {
  title?: string;
  description?: string;
  category?: string | null;
  reason?: string;
  content?: string;
}

interface QuickCreateBody {
  type: "topic" | "problem";
  title: string;
  category?: string;
  difficulty?: string;
  patterns?: string[];
  companies?: string[];
  /** Study plan context for AI-enriched metadata generation. */
  planContext?: PlanContext;
}

const VALID_CATEGORIES: Topic["category"][] = [
  "dsa",
  "system-design",
  "database",
  "networking",
  "os",
  "oop",
];

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as QuickCreateBody;

    if (!body.title || !body.title.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 },
      );
    }

    if (!body.type || !["topic", "problem"].includes(body.type)) {
      return NextResponse.json(
        { error: "Type must be 'topic' or 'problem'" },
        { status: 400 },
      );
    }

    const workspacePath = getWorkspacePath();
    const config = await loadPromptConfig();

    // Try to generate AI-enriched metadata
    const aiMetadata = await generateMetadata(body, config);

    if (body.type === "topic") {
      return await createTopic(body, aiMetadata, workspacePath);
    } else {
      return await createProblem(body, aiMetadata, workspacePath);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── Topic Creation ─────────────────────────────────────────────────────────

async function createTopic(
  body: QuickCreateBody,
  ai: AIMetadata | null,
  workspacePath: string,
) {
  const category = VALID_CATEGORIES.includes(
    (ai?.category || body.category) as Topic["category"],
  )
    ? ((ai?.category || body.category) as Topic["category"])
    : "dsa";

  const difficulty: Topic["difficulty"] =
    isValidDifficulty(ai?.difficulty || body.difficulty)
      ? ((ai?.difficulty || body.difficulty) as Topic["difficulty"])
      : "medium";

  const repo = new FileTopicRepository(workspacePath);

  // Check if topic already exists (by slug)
  const existing = await repo.getAll();
  const slug = body.title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const exists = existing.find((t) => t.id === slug);
  if (exists) {
    return NextResponse.json({
      created: false,
      existing: true,
      item: { id: exists.id, title: exists.title, type: "topic" },
    });
  }

  const topic = await repo.create({
    title: body.title.trim(),
    category,
    difficulty,
    status: "not-started",
    confidence: 1,
    tags: ai?.tags || [],
    estimatedMinutes: ai?.estimatedMinutes,
    semanticDescription: ai?.semanticDescription,
  });

  return NextResponse.json({
    created: true,
    item: { id: topic.id, title: topic.title, type: "topic" },
    metadata: ai ? { tags: ai.tags, difficulty, category, estimatedMinutes: ai.estimatedMinutes } : null,
  });
}

// ─── Problem Creation ───────────────────────────────────────────────────────

async function createProblem(
  body: QuickCreateBody,
  ai: AIMetadata | null,
  workspacePath: string,
) {
  const difficulty: Problem["difficulty"] =
    isValidDifficulty(ai?.difficulty || body.difficulty)
      ? ((ai?.difficulty || body.difficulty) as Problem["difficulty"])
      : "medium";

  const repo = new FileProblemRepository(workspacePath);

  // Check if problem already exists (by slug)
  const existing = await repo.getAll();
  const slug = body.title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const exists = existing.find((p) => p.id === slug);
  if (exists) {
    return NextResponse.json({
      created: false,
      existing: true,
      item: { id: exists.id, title: exists.title, type: "problem" },
    });
  }

  const problem = await repo.create({
    title: body.title.trim(),
    difficulty,
    companies: ai?.companies || body.companies || [],
    patterns: ai?.patterns || body.patterns || [],
    status: "not-started",
    favorite: false,
    frequency: ai?.frequency as Problem["frequency"] | undefined,
    timeComplexity: ai?.timeComplexity as Problem["timeComplexity"] | undefined,
    spaceComplexity: ai?.spaceComplexity as Problem["spaceComplexity"] | undefined,
    semanticDescription: ai?.semanticDescription,
  });

  return NextResponse.json({
    created: true,
    item: { id: problem.id, title: problem.title, type: "problem" },
    metadata: ai
      ? { patterns: ai.patterns, companies: ai.companies, difficulty, frequency: ai.frequency }
      : null,
  });
}

// ─── AI Metadata Generation ─────────────────────────────────────────────────

interface AIMetadata {
  category?: string;
  difficulty?: string;
  tags?: string[];
  patterns?: string[];
  companies?: string[];
  frequency?: string;
  estimatedMinutes?: number;
  timeComplexity?: string;
  spaceComplexity?: string;
  semanticDescription?: SemanticDescription;
}

async function generateMetadata(
  body: QuickCreateBody,
  config: PromptConfig,
): Promise<AIMetadata | null> {
  try {
    const client = await getReadyClient("quick-create");

    const available = await client.isAvailable();
    if (!available) return null;

    const prompt = buildMetadataPrompt(body, config);

    let raw = "";
    for await (const chunk of client.generate(prompt)) {
      raw += chunk;
    }

    return parseMetadataResponse(raw);
  } catch {
    // AI unavailable — create with minimal metadata
    return null;
  }
}

function buildMetadataPrompt(body: QuickCreateBody, config: PromptConfig): string {
  const planCtx = body.planContext;
  const planSection = planCtx
    ? `
## Study Plan Context
- Plan Title: ${planCtx.title || "N/A"}
- Plan Description: ${planCtx.description || "N/A"}
- Plan Category: ${planCtx.category || "General"}
- Item Reason: ${planCtx.reason || "N/A"}
${planCtx.content ? `- Plan Content (excerpt): ${planCtx.content.slice(0, 1500)}` : ""}`
    : "";

  if (body.type === "topic") {
    return `You are a senior engineering interview coach. Generate metadata for a study topic.

## User Context
- Experience Level: ${config.experienceLevel} YOE
- Target Role: ${config.targetRole}
- Target Companies: ${config.targetCompanies.join(", ")}

## Topic to Create
Title: "${body.title}"
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
    "targetLevel": "${config.experienceLevel <= 1 ? "beginner" : config.experienceLevel <= 5 ? "intermediate" : config.experienceLevel <= 10 ? "senior" : "staff"}",
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

  // Problem type
  return `You are a senior engineering interview coach. Generate metadata for a coding problem.

## User Context
- Experience Level: ${config.experienceLevel} YOE
- Target Role: ${config.targetRole}
- Target Companies: ${config.targetCompanies.join(", ")}

## Problem to Create
Title: "${body.title}"
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
    "targetLevel": "${config.experienceLevel <= 1 ? "beginner" : config.experienceLevel <= 5 ? "intermediate" : config.experienceLevel <= 10 ? "senior" : "staff"}",
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

function parseMetadataResponse(raw: string): AIMetadata | null {
  try {
    let jsonStr = raw.trim();
    // Handle markdown code fences
    const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();
    // Find JSON object
    const firstBrace = jsonStr.indexOf("{");
    const lastBrace = jsonStr.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;

    const result: AIMetadata = {};

    if (typeof parsed.category === "string") result.category = parsed.category;
    if (typeof parsed.difficulty === "string") result.difficulty = parsed.difficulty;
    if (Array.isArray(parsed.tags)) result.tags = parsed.tags.map(String);
    if (Array.isArray(parsed.patterns)) result.patterns = parsed.patterns.map(String);
    if (Array.isArray(parsed.companies)) result.companies = parsed.companies.map(String);
    if (typeof parsed.frequency === "string") result.frequency = parsed.frequency;
    if (typeof parsed.estimatedMinutes === "number") result.estimatedMinutes = parsed.estimatedMinutes;
    if (typeof parsed.timeComplexity === "string") result.timeComplexity = parsed.timeComplexity;
    if (typeof parsed.spaceComplexity === "string") result.spaceComplexity = parsed.spaceComplexity;

    if (parsed.semanticDescription && typeof parsed.semanticDescription === "object") {
      const sd = parsed.semanticDescription as Record<string, unknown>;
      result.semanticDescription = {
        intent: typeof sd.intent === "string" ? sd.intent : undefined,
        targetLevel: typeof sd.targetLevel === "string"
          ? (sd.targetLevel as "beginner" | "intermediate" | "senior" | "staff" | "principal")
          : undefined,
        context: typeof sd.context === "string" ? sd.context : undefined,
        focus: Array.isArray(sd.focus) ? sd.focus.map(String) : undefined,
        knownConcepts: Array.isArray(sd.knownConcepts) ? sd.knownConcepts.map(String) : undefined,
      };
    }

    return result;
  } catch {
    return null;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function isValidDifficulty(d: string | undefined): boolean {
  return d === "easy" || d === "medium" || d === "hard";
}
