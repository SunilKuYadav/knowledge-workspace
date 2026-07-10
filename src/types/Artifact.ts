import { z } from "zod";

/**
 * All supported artifact types for a topic.
 * The app renders whatever files exist — no artifact is required.
 * Adding a new artifact type here is all that's needed to support it everywhere.
 */
export const ArtifactSchema = z.enum([
  "overview",
  "notes",
  "patterns",
  "mistakes",
  "implementation",
  "examples",
  "interview",
  "cheatsheet",
]);

export type ArtifactType = z.infer<typeof ArtifactSchema>;

/**
 * Human-readable labels for each artifact, used in tab navigation.
 */
export const ARTIFACT_LABELS: Record<ArtifactType, string> = {
  overview: "Overview",
  notes: "Notes",
  patterns: "Patterns",
  mistakes: "Mistakes",
  implementation: "Implementation",
  examples: "Examples",
  interview: "Interview",
  cheatsheet: "Cheatsheet",
};

/**
 * Canonical display order for artifact tabs, sequenced for optimal learning:
 *
 * 1. Overview     — Big-picture introduction (what & why)
 * 2. Notes        — Core study material (concepts, theory, details)
 * 3. Examples     — Concrete examples to solidify understanding
 * 4. Implementation — Hands-on code (apply what was learned)
 * 5. Patterns     — Recognize recurring techniques (requires foundation)
 * 6. Mistakes     — Common pitfalls to avoid (requires pattern awareness)
 * 7. Interview    — Practice questions (tests all prior knowledge)
 * 8. Cheatsheet   — Quick-reference summary (final consolidation for recall)
 *
 * Unknown artifact names fall to the end.
 */
export const ARTIFACT_ORDER: ArtifactType[] = [
  "overview",
  "notes",
  "examples",
  "implementation",
  "patterns",
  "mistakes",
  "interview",
  "cheatsheet",
];
