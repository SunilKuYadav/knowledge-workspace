import type { Problem, ProblemDescription, SemanticDescription } from "@/types";

/** Problem sections that can be AI-generated. */
export type ProblemSection = "description" | "notes";

export const PROBLEM_SECTION_ORDER: ProblemSection[] = [
  "description",
  "notes",
];

export const PROBLEM_SECTION_LABELS: Record<ProblemSection, string> = {
  description: "Description",
  notes: "Notes",
};

export type GenerationState =
  | { status: "idle" }
  | { status: "generating"; section: string; content: string }
  | { status: "done"; section: string; content: string }
  | { status: "error"; section: string; message: string };

export interface BatchProgress {
  total: number;
  current: number;
  completed: string[];
  active: boolean;
}

export interface ProblemGenerateButtonProps {
  problem: Problem;
  hasDescription: boolean;
  hasNotes: boolean;
  hasSolution: boolean;
  solutionCode?: string;
  onDescriptionGenerated: (desc: ProblemDescription) => void;
  onNotesGenerated: (notes: string) => void;
}
