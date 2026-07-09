/**
 * /api/ai/study-plans
 *
 * GET  — List all saved study plans
 * POST — Generate and persist a new study plan via AI
 * PUT  — Update a plan (mark items complete, toggle active)
 * DELETE — Remove a study plan
 */

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { v4 as uuid } from "uuid";
import { createAIClient } from "@/ai";
import { buildStudyPlanPrompt } from "@/ai/prompts";
import { getWorkspacePath } from "@/src/lib/constants";
import { FileTopicRepository } from "@/src/filesystem/FileTopicRepository";
import { FileProblemRepository } from "@/src/filesystem/FileProblemRepository";
import { loadPromptConfig } from "@/src/ai/prompts/loadConfig";
import type { StudyPlan } from "@/types";

const DEFAULT_BASE_URL =
  process.env.OPENAI_BASE_URL || "http://127.0.0.1:1234/v1";
const API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL = process.env.OPENAI_MODEL || "gpt-3.5-turbo";

function getPlansDir(): string {
  return path.join(getWorkspacePath(), ".config", "study-plans");
}

async function ensurePlansDir(): Promise<void> {
  const dir = getPlansDir();
  await fs.mkdir(dir, { recursive: true });
}

async function readAllPlans(): Promise<StudyPlan[]> {
  const dir = getPlansDir();
  try {
    const files = await fs.readdir(dir);
    const plans: StudyPlan[] = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const raw = await fs.readFile(path.join(dir, file), "utf-8");
        plans.push(JSON.parse(raw) as StudyPlan);
      } catch {
        // Skip invalid files
      }
    }
    return plans.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  } catch {
    return [];
  }
}

// ─── GET: List all plans ────────────────────────────────────────────────────

export async function GET() {
  await ensurePlansDir();
  const plans = await readAllPlans();
  return NextResponse.json({ plans });
}

// ─── POST: Generate a new plan ──────────────────────────────────────────────

interface GenerateBody {
  category?: string;
  timelineWeeks?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerateBody;
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

    // Gather current state
    const workspacePath = getWorkspacePath();
    const topicRepo = new FileTopicRepository(workspacePath);
    const problemRepo = new FileProblemRepository(workspacePath);
    const [allTopics, allProblems] = await Promise.all([
      topicRepo.getAll(),
      problemRepo.getAll(),
    ]);

    const topicsSummary = allTopics
      .map((t) => `${t.title} (${t.category}, ${t.status}, confidence: ${t.confidence}/5)`)
      .join("\n");
    const problemsSummary = allProblems
      .map((p) => `${p.title} (${p.difficulty}, ${p.status}, patterns: ${p.patterns.join(", ")})`)
      .join("\n");

    const coverageStats = {
      totalTopics: allTopics.length,
      completedTopics: allTopics.filter((t) => t.status === "completed").length,
      avgConfidence:
        allTopics.length > 0
          ? allTopics.reduce((s, t) => s + t.confidence, 0) / allTopics.length
          : 0,
      totalProblems: allProblems.length,
      solvedProblems: allProblems.filter((p) => p.status === "solved").length,
      patternsCovered: [...new Set(allProblems.flatMap((p) => p.patterns))],
    };

    const prompt = buildStudyPlanPrompt({
      category: body.category,
      timelineWeeks: body.timelineWeeks,
      topicsSummary,
      problemsSummary,
      coverageStats,
      experienceLevel: config.experienceLevel,
      targetRole: config.targetRole,
      targetCompanies: config.targetCompanies,
      config,
    });

    // Stream to collect full response
    let raw = "";
    for await (const chunk of client.generate(prompt)) {
      raw += chunk;
    }

    // Parse JSON
    let jsonStr = raw.trim();
    const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();
    const firstBrace = jsonStr.indexOf("{");
    const lastBrace = jsonStr.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { error: "AI returned invalid JSON. Please try again." },
        { status: 502 },
      );
    }

    const now = new Date().toISOString();
    const plan: StudyPlan = {
      id: uuid(),
      title: String(parsed.title || "Study Plan"),
      description: String(parsed.description || ""),
      category: (parsed.category as string) || body.category || null,
      timelineWeeks: Number(parsed.timelineWeeks) || body.timelineWeeks || 4,
      items: Array.isArray(parsed.items)
        ? (parsed.items as Array<Record<string, unknown>>).map((item) => ({
            id: String(item.id || uuid()),
            type: item.type === "problem" ? "problem" : "topic",
            title: String(item.title || ""),
            completed: false,
            reason: item.reason ? String(item.reason) : undefined,
            estimatedMinutes: item.estimatedMinutes
              ? Number(item.estimatedMinutes)
              : undefined,
            priority: ["high", "medium", "low"].includes(String(item.priority))
              ? (String(item.priority) as "high" | "medium" | "low")
              : undefined,
          }))
        : [],
      content: String(parsed.content || ""),
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    // Persist
    await ensurePlansDir();
    await fs.writeFile(
      path.join(getPlansDir(), `${plan.id}.json`),
      JSON.stringify(plan, null, 2),
    );

    return NextResponse.json({ plan });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── PUT: Update a plan ─────────────────────────────────────────────────────

interface UpdateBody {
  id: string;
  /** Toggle active status. */
  active?: boolean;
  /** Mark specific item IDs as complete/incomplete. */
  itemUpdates?: Array<{ itemId: string; completed: boolean }>;
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as UpdateBody;

    if (!body.id) {
      return NextResponse.json({ error: "Missing plan id" }, { status: 400 });
    }

    const planPath = path.join(getPlansDir(), `${body.id}.json`);
    let plan: StudyPlan;
    try {
      const raw = await fs.readFile(planPath, "utf-8");
      plan = JSON.parse(raw) as StudyPlan;
    } catch {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    if (body.active !== undefined) {
      plan.active = body.active;
    }

    if (body.itemUpdates) {
      for (const update of body.itemUpdates) {
        const item = plan.items.find((i) => i.id === update.itemId);
        if (item) {
          item.completed = update.completed;
        }
      }
    }

    plan.updatedAt = new Date().toISOString();
    await fs.writeFile(planPath, JSON.stringify(plan, null, 2));

    return NextResponse.json({ plan });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── DELETE: Remove a plan ──────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing plan id" }, { status: 400 });
    }

    const planPath = path.join(getPlansDir(), `${id}.json`);
    try {
      await fs.unlink(planPath);
    } catch {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
