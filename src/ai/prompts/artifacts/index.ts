/**
 * Artifact prompt registry.
 *
 * Maps every ArtifactType to its generation instructions.
 * To add a new artifact type:
 *   1. Create a new file in this directory (e.g. faq.ts)
 *   2. Export a const with the prompt string
 *   3. Add it to ARTIFACT_PROMPTS below
 *   4. Add the type to ArtifactSchema in src/types/Artifact.ts
 *
 * No other files need to change.
 */

import type { ArtifactType } from "@/types";
import { OVERVIEW_ARTIFACT_PROMPT } from "./overview";
import { NOTES_ARTIFACT_PROMPT } from "./notes";
import { PATTERNS_ARTIFACT_PROMPT } from "./patterns";
import { MISTAKES_ARTIFACT_PROMPT } from "./mistakes";
import { IMPLEMENTATION_ARTIFACT_PROMPT } from "./implementation";
import { EXAMPLES_ARTIFACT_PROMPT } from "./examples";
import { INTERVIEW_ARTIFACT_PROMPT } from "./interview";
import { CHEATSHEET_ARTIFACT_PROMPT } from "./cheatsheet";

export {
  OVERVIEW_ARTIFACT_PROMPT,
  NOTES_ARTIFACT_PROMPT,
  PATTERNS_ARTIFACT_PROMPT,
  MISTAKES_ARTIFACT_PROMPT,
  IMPLEMENTATION_ARTIFACT_PROMPT,
  EXAMPLES_ARTIFACT_PROMPT,
  INTERVIEW_ARTIFACT_PROMPT,
  CHEATSHEET_ARTIFACT_PROMPT,
};

/**
 * Lookup map from artifact type to its generation prompt.
 * Used by buildArtifactPrompt() and the master generation builder.
 */
export const ARTIFACT_PROMPTS: Record<ArtifactType, string> = {
  overview: OVERVIEW_ARTIFACT_PROMPT,
  notes: NOTES_ARTIFACT_PROMPT,
  patterns: PATTERNS_ARTIFACT_PROMPT,
  mistakes: MISTAKES_ARTIFACT_PROMPT,
  implementation: IMPLEMENTATION_ARTIFACT_PROMPT,
  examples: EXAMPLES_ARTIFACT_PROMPT,
  interview: INTERVIEW_ARTIFACT_PROMPT,
  cheatsheet: CHEATSHEET_ARTIFACT_PROMPT,
};
