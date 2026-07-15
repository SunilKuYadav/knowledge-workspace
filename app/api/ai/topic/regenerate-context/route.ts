/**
 * POST /api/ai/topic/regenerate-context
 *
 * Regenerates or generates a semantic description (AI Context) for a topic
 * based on its existing content (title, tags, category, notes, linked problems, etc.).
 */

import { NextRequest, NextResponse } from "next/server";
import { getReadyClient } from "@/ai";
import { loadPromptConfig } from "@/src/ai/prompts/loadConfig";
import { getWorkspacePath } from "@/src/lib/constants";
import { FileTopicRepository } from "@/src/filesystem/FileTopicRepository";
import { FileProblemRepository } from "@/src/filesystem/FileProblemRepository";
import { TopicService } from "@/src/services/TopicService";
import { ProblemService } from "@/src/services/ProblemService";
import { composeWithConfig } from "@/ai/prompts/utils/compose";
import { JSON_CONTEXT } from "@/src/ai/prompts/system/json";
import type { SemanticDescription } from "@/types";

interface RequestBody {
  topicId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody;

    if (!body.topicId) {
      return NextResponse.json(
        { error: "Missing required field: topicId" },
        { status: 400 },
      );
    }

    const workspacePath = getWorkspacePath();
    const topicService = new TopicService(new FileTopicRepository(workspacePath));
    const problemService = new ProblemService(new FileProblemRepository(workspacePath));

    const topic = await topicService.getTopicById(body.topicId);
    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    const client = await getReadyClient("ai/topic/regenerate-context");
    const available = await client.isAvailable();
    if (!available) {
      return NextResponse.json(
        { error: "AI service is currently unavailable" },
        { status: 503 },
      );
    }

    // Gather topic content for context
    const artifacts = await topicService.getArtifacts(body.topicId);
    const overviewContent = artifacts["overview"] || "";
    const notesContent = artifacts["notes"] || "";
    const patternsContent = artifacts["patterns"] || "";

    // Gather linked problem info
    const linkedProblemIds = topic.relatedProblemIds ?? [];
    let linkedProblemsContext = "";
    if (linkedProblemIds.length > 0) {
      const allProblems = await problemService.getAllProblems();
      const linked = allProblems.filter((p) => linkedProblemIds.includes(p.id));
      linkedProblemsContext = linked
        .map((p) => `- ${p.title} (${p.difficulty}, patterns: ${p.patterns.join(", ")})`)
        .join("\n");
    }

    const config = await loadPromptConfig();
    const prompt = buildRegenerateContextPrompt({
      title: topic.title,
      category: topic.category,
      difficulty: topic.difficulty,
      tags: topic.tags,
      overviewContent: overviewContent.slice(0, 2000),
      notesContent: notesContent.slice(0, 2000),
      patternsContent: patternsContent.slice(0, 1500),
      linkedProblemsContext,
      config,
    });

    let raw = "";
    for await (const chunk of client.generate(prompt)) {
      raw += chunk;
    }

    // Parse JSON response
    const semanticDescription = parseSemanticDescription(raw);
    if (!semanticDescription) {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 },
      );
    }

    // Save updated semantic description to topic
    await topicService.updateTopic(body.topicId, { semanticDescription });

    return NextResponse.json({ semanticDescription });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── Prompt Builder ─────────────────────────────────────────────────────────

interface RegenerateContextParams {
  title: string;
  category: string;
  difficulty: string;
  tags: string[];
  overviewContent: string;
  notesContent: string;
  patternsContent: string;
  linkedProblemsContext: string;
  config: import("@/types/PromptConfig").PromptConfig;
}

function getTargetLevel(experienceLevel: number): string {
  if (experienceLevel <= 1) return "beginner";
  if (experienceLevel <= 5) return "intermediate";
  if (experienceLevel <= 10) return "senior";
  return "staff";
}

function buildRegenerateContextPrompt(params: RegenerateContextParams): string {
  const {
    title,
    category,
    difficulty,
    tags,
    overviewContent,
    notesContent,
    patternsContent,
    linkedProblemsContext,
    config,
  } = params;

  const targetLevel = getTargetLevel(config.experienceLevel);

  const contentSection = [
    overviewContent && `### Overview (excerpt)\n${overviewContent}`,
    notesContent && `### Notes (excerpt)\n${notesContent}`,
    patternsContent && `### Patterns (excerpt)\n${patternsContent}`,
    linkedProblemsContext && `### Linked Problems\n${linkedProblemsContext}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const task = `Regenerate the AI context (semantic description) for an existing topic based on its actual content.

## User Context
- Experience Level: ${config.experienceLevel} YOE
- Target Role: ${config.targetRole}
- Target Companies: ${config.targetCompanies.join(", ")}

## Topic Metadata
- Title: "${title}"
- Category: ${category}
- Difficulty: ${difficulty}
- Tags: ${tags.join(", ")}

## Existing Content
${contentSection || "No content yet — generate based on title, category, and tags."}

## Your Task
Generate a semantic description JSON that captures the learning intent for this topic, calibrated to the user's level and based on the actual content above.

Return ONLY valid JSON:
{
  "intent": "what the user should get from studying this topic (1-2 sentences, specific to the content above, calibrated for ${config.experienceLevel} YOE)",
  "targetLevel": "${targetLevel}",
  "context": "why this topic matters for ${config.targetRole} interviews at ${config.targetCompanies.join("/")} (1 sentence)",
  "focus": ["2-4 focus areas derived from the actual content, e.g. 'implementation', 'interview', 'theory', 'production'"],
  "knownConcepts": ["2-4 prerequisite concepts the user likely already knows at ${config.experienceLevel} YOE that can be skipped"]
}

Rules:
- intent should be SPECIFIC to this topic's actual content, not generic
- focus areas should reflect what the content actually covers
- knownConcepts should list concepts that are prerequisites for this topic at this level
- If there's existing content, use it to make the semantic description more precise and targeted
- If no content exists, infer from the title, category, and tags
- Return ONLY the JSON object, nothing else`;

  return composeWithConfig({
    actionKeys: ["identity", "interview"],
    extraModules: [JSON_CONTEXT],
    task,
    config,
  });
}

// ─── Response Parser ────────────────────────────────────────────────────────

function parseSemanticDescription(raw: string): SemanticDescription | null {
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

    const result: SemanticDescription = {
      intent: typeof parsed.intent === "string" ? parsed.intent : undefined,
      targetLevel:
        typeof parsed.targetLevel === "string"
          ? (parsed.targetLevel as "beginner" | "intermediate" | "senior" | "staff" | "principal")
          : undefined,
      context: typeof parsed.context === "string" ? parsed.context : undefined,
      focus: Array.isArray(parsed.focus) ? parsed.focus.map(String) : undefined,
      knownConcepts: Array.isArray(parsed.knownConcepts)
        ? parsed.knownConcepts.map(String)
        : undefined,
    };

    // Ensure at least intent is present
    if (!result.intent) return null;

    return result;
  } catch {
    return null;
  }
}
