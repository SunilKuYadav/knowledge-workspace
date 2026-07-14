import type { ArtifactType } from "@/types";
import type { SemanticDescription } from "@/types";

export type GenerationState =
  | { status: "idle" }
  | { status: "generating"; artifact: string; content: string }
  | { status: "done"; artifact: string; content: string }
  | { status: "error"; artifact: string; message: string };

/** Progress tracker for batch "Generate All" operations */
export interface BatchProgress {
  /** Total number of artifacts to generate */
  total: number;
  /** Index of the artifact currently being generated (0-based) */
  current: number;
  /** Artifacts that have been completed so far */
  completed: string[];
  /** Whether the batch operation is active */
  active: boolean;
}

export interface GenerateArtifactButtonProps {
  existingArtifacts: string[];
  topicId: string;
  topicTitle: string;
  topicCategory: string;
  semanticDescription?: SemanticDescription;
  onGenerated: (artifact: string, content: string) => void;
}

export interface GenerationPanelProps {
  generation: GenerationState;
  batchProgress: BatchProgress | null;
  panelRef: React.RefObject<HTMLDivElement | null>;
  onCancel: () => void;
  onDismiss: () => void;
}
