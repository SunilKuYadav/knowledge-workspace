import type { Problem, ProblemDescription, RevisionData } from "@/types";

export type Tab = "overview" | "description" | "practice" | "test-suite" | "solution" | "notes" | "variations";

/** Identifies what problem context is being practiced — either the main problem or a variation */
export interface PracticeTarget {
  type: "main" | "variation";
  /** For variation, the variation ID */
  variationId?: string;
  /** Title to show in the selector */
  title: string;
  /** Difficulty level */
  difficulty: "easy" | "medium" | "hard";
}

export interface SolutionEvaluation {
  overallScore: number; // 0-100
  feedback: string;
  strengths: string[];
  improvements: string[];
  complexity: {
    time: string;
    space: string;
  };
  edgeCases?: string[];
  alternativeApproaches?: string[];
}

export interface ProblemWorkspaceProps {
  problem: Problem;
  description: ProblemDescription | null;
  initialNotes: string;
  initialSolution: string;
  initialDraft: string;
  revision: RevisionData;
}
