import type { Problem } from "@/src/types";

export type DifficultyFilter = "" | "easy" | "medium" | "hard";
export type StatusFilter = "" | "not-started" | "attempted" | "solved";

export interface ProblemsListClientProps {
  problems: Problem[];
}
