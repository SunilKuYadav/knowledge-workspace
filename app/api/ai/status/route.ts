/**
 * GET /api/ai/status
 *
 * Returns the current AI service availability status, model routing info,
 * and the currently loaded model (via model manager).
 *
 * Requirements: 6.1, 6.4
 */

import { NextResponse } from "next/server";
import { createAIClient } from "@/src/ai/client";
import { getAllModels } from "@/src/ai/model-router";
import { modelManager } from "@/src/ai/model-manager";

const client = createAIClient({
  baseUrl: process.env.OPENAI_BASE_URL || "http://127.0.0.1:1234/v1",
  apiKey: process.env.OPENAI_API_KEY || "",
});

export async function GET() {
  const available = await client.isAvailable();
  const currentModel = modelManager.getCurrentModel();
  const loadedModels = await modelManager.getLoadedModels();

  return NextResponse.json({
    available,
    models: getAllModels(),
    currentModel,
    loadedModels,
  });
}
