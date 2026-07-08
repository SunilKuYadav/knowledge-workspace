/**
 * Server-side utility to load the user's prompt configuration from disk.
 *
 * Used by API routes to apply the user's experience level and customization
 * when building prompts.
 */

import { promises as fs } from "fs";
import path from "path";
import { getWorkspacePath } from "@/src/lib/constants";
import {
  PromptConfigSchema,
  DEFAULT_PROMPT_CONFIG,
  type PromptConfig,
} from "@/types/PromptConfig";

let cachedConfig: PromptConfig | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5000; // Re-read from disk at most every 5 seconds

/**
 * Loads the prompt config from the workspace.
 * Caches for 5 seconds to avoid repeated disk reads on the same request batch.
 */
export async function loadPromptConfig(): Promise<PromptConfig> {
  const now = Date.now();
  if (cachedConfig && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedConfig;
  }

  try {
    const configPath = path.join(
      getWorkspacePath(),
      ".config",
      "prompt-config.json",
    );
    const raw = await fs.readFile(configPath, "utf-8");
    const parsed = PromptConfigSchema.safeParse(JSON.parse(raw));

    if (parsed.success) {
      cachedConfig = parsed.data;
      cacheTimestamp = now;
      return parsed.data;
    }
  } catch {
    // File doesn't exist or is invalid — use defaults
  }

  cachedConfig = DEFAULT_PROMPT_CONFIG;
  cacheTimestamp = now;
  return DEFAULT_PROMPT_CONFIG;
}
