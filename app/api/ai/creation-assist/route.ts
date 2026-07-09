/**
 * POST /api/ai/creation-assist
 *
 * AI-assisted creation endpoint. Provides intelligent suggestions when
 * creating new topics or problems:
 * - Topic: prerequisites, related topics, estimated time, skeleton overview
 * - Problem: related topics, similar problems, readiness assessment
 */

import { NextRequest, NextResponse } from "next/server";
import { createAIClient } from "@/ai";
import {
  buildTopicCreationAssistPrompt,
  buildProblemCreationAssistPrompt,
} from "@/ai/prompts";
import { getWorkspacePath } from "@/src/lib/constants";
import { FileTopicRepository } from "@/src/filesystem/FileTopicRepository";
import { FileProblemRepository } from "@/src/filesystem/FileProblemRepository";

const DEFAULT_BASE_URL =
  process.env.OPENAI_BASE_URL || "http://127.0.0.1:1234/v1";
const API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL = process.env.OPENAI_MODEL || "gpt-3.5-turbo";

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

    const workspacePath = getWorkspacePath();
    const topicRepo = new FileTopicRepository(workspacePath);
    const allTopics = await topicRepo.getAll();
    const existingTopics = allTopics.map((t) => ({
      id: t.id,
      title: t.title,
      category: t.category,
    }));

    let prompt: string;

    if (body.type === "topic") {
      prompt = buildTopicCreationAssistPrompt({
        title: body.title,
        category: body.category,
        difficulty: body.difficulty,
        tags: body.tags,
        existingTopics,
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
