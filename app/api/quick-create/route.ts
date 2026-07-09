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
import { buildQuickCreateMetadataPrompt } from "@/src/ai/prompts/builders";
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

    const prompt = buildQuickCreateMetadataPrompt({
      type: body.type,
      title: body.title,
      planContext: body.planContext,
      config,
    });

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
