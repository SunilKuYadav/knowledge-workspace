import type { Problem, ProblemDescription, RevisionData } from "@/types";

export type Tab = "overview" | "description" | "practice" | "solution" | "notes" | "variations";

export interface ProblemWorkspaceProps {
  problem: Problem;
  description: ProblemDescription | null;
  initialNotes: string;
  initialSolution: string;
  revision: RevisionData;
}
