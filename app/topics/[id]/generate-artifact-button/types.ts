import type { ArtifactType } from "@/types";

export type GenerationState =
  | { status: "idle" }
  | { status: "generating"; artifact: string; content: string }
  | { status: "done"; artifact: string; content: string }
  | { status: "error"; artifact: string; message: string };

export interface GenerateArtifactButtonProps {
  existingArtifacts: string[];
  topicId: string;
  topicTitle: string;
  topicCategory: string;
  onGenerated: (artifact: string, content: string) => void;
}

export interface GenerationPanelProps {
  generation: GenerationState;
  panelRef: React.RefObject<HTMLDivElement | null>;
  onCancel: () => void;
  onDismiss: () => void;
}
