/**
 * API route for reading and writing the user's prompt configuration.
 *
 * GET  — returns the current PromptConfig (or defaults)
 * PUT  — saves a new PromptConfig to the workspace
 */

import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getWorkspacePath } from "@/src/lib/constants";
import {
  PromptConfigSchema,
  DEFAULT_PROMPT_CONFIG,
  type PromptConfig,
} from "@/types/PromptConfig";

function getConfigPath(): string {
  return path.join(getWorkspacePath(), ".config", "prompt-config.json");
}

export async function GET() {
  try {
    const configPath = getConfigPath();
    const raw = await fs.readFile(configPath, "utf-8");
    const parsed = PromptConfigSchema.safeParse(JSON.parse(raw));

    if (parsed.success) {
      return NextResponse.json(parsed.data);
    }

    // If file exists but is invalid, return defaults
    return NextResponse.json(DEFAULT_PROMPT_CONFIG);
  } catch {
    // File doesn't exist yet — return defaults
    return NextResponse.json(DEFAULT_PROMPT_CONFIG);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = PromptConfigSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid configuration", details: parsed.error.format() },
        { status: 400 },
      );
    }

    const configPath = getConfigPath();
    const configDir = path.dirname(configPath);

    // Ensure directory exists
    await fs.mkdir(configDir, { recursive: true });

    // Write config
    await fs.writeFile(configPath, JSON.stringify(parsed.data, null, 2), "utf-8");

    return NextResponse.json(parsed.data);
  } catch {
    return NextResponse.json(
      { error: "Failed to save configuration" },
      { status: 500 },
    );
  }
}
