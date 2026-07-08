/**
 * API route for previewing the final generated prompts based on current config.
 *
 * POST — accepts a PromptConfig and returns the generated prompt text for all actions.
 */

import { NextRequest, NextResponse } from "next/server";
import { PromptConfigSchema, PROMPT_ACTION_KEYS } from "@/types/PromptConfig";
import { getPromptForAction } from "@/ai/prompts/config";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = PromptConfigSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid configuration", details: parsed.error.format() },
        { status: 400 },
      );
    }

    const config = parsed.data;
    const prompts: Record<string, string> = {};

    for (const key of PROMPT_ACTION_KEYS) {
      prompts[key] = getPromptForAction(key, config);
    }

    return NextResponse.json({ prompts });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate prompt preview" },
      { status: 500 },
    );
  }
}
