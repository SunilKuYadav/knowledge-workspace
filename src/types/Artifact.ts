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
 * Canonical display order for artifact tabs.
 * Artifacts discovered on disk are sorted by this order.
 * Unknown artifact names fall to the end.
 */
export const ARTIFACT_ORDER: ArtifactType[] = [
  "overview",
  "notes",
  "patterns",
  "mistakes",
  "implementation",
  "examples",
  "interview",
  "cheatsheet",
];
