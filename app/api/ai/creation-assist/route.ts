/**
 * POST /api/ai/creation-assist
 *
 * AI-assisted creation endpoint. Provides intelligent suggestions when
 * creating new topics or problems:
 * - Topic: prerequisites, related topics, estimated time, skeleton overview
 * - Problem: related topics, similar problems, readiness assessment
 */

import { NextRequest, NextResponse } from "next/server";
import { getReadyClient } from "@/ai";
import {
  buildTopicCreationAssistPrompt,
  buildProblemCreationAssistPrompt,
} from "@/ai/prompts";
import { loadPromptConfig } from "@/src/ai/prompts/loadConfig";
import { getWorkspacePath } from "@/src/lib/constants";
import { FileTopicRepository } from "@/src/filesystem/FileTopicRepository";
import { FileProblemRepository } from "@/src/filesystem/FileProblemRepository";

interface TopicAssistBody {
  type: "topic";
  title: string;
  category: string;
  difficulty: string;
  tags: string[];
}

interface ProblemAssistBody {
  type: "problem";
  title: string;
  difficulty: string;
  patterns: string[];
  companies: string[];
}

type RequestBody = TopicAssistBody | ProblemAssistBody;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody;

    if (!body.type || !body.title) {
      return NextResponse.json(
        { error: "Missing required fields: type, title" },
        { status: 400 },
      );
    }

    const client = await getReadyClient("ai/creation-assist");

    const available = await client.isAvailable();
    if (!available) {
      return NextResponse.json(
        { error: "AI service is currently unavailable" },
        { status: 503 },
      );
    }

    const workspacePath = getWorkspacePath();
    const topicRepo = new FileTopicRepository(workspacePath);
    const allTopics = await topicRepo.getAll();
    const existingTopics = allTopics.map((t) => ({
      id: t.id,
      title: t.title,
      category: t.category,
    }));

    const promptConfig = await loadPromptConfig();
    let prompt: string;

    if (body.type === "topic") {
      prompt = buildTopicCreationAssistPrompt({
        title: body.title,
        category: body.category,
        difficulty: body.difficulty,
        tags: body.tags,
        existingTopics,
        config: promptConfig,
      });
    } else {
      const problemRepo = new FileProblemRepository(workspacePath);
      const allProblems = await problemRepo.getAll();
      const existingProblems = allProblems.map((p) => ({
        id: p.id,
        title: p.title,
        patterns: p.patterns,
        difficulty: p.difficulty,
      }));

      prompt = buildProblemCreationAssistPrompt({
        title: body.title,
        difficulty: body.difficulty,
        patterns: body.patterns,
        companies: body.companies,
        existingTopics,
        existingProblems,
        config: promptConfig,
      });
    }

    let raw = "";
    for await (const chunk of client.generate(prompt)) {
      raw += chunk;
    }

    // Parse JSON response
    let jsonStr = raw.trim();
    const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();

    const firstBrace = jsonStr.indexOf("{");
    const lastBrace = jsonStr.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(jsonStr);
    return NextResponse.json({ suggestions: parsed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
