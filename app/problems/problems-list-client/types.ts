import type { Problem } from "@/src/types";

export type DifficultyFilter = "" | "easy" | "medium" | "hard";
export type StatusFilter = "" | "not-started" | "attempted" | "solved";
export type PlatformFilter = "" | "leetcode" | "codeforces" | "gfg";

export interface ProblemsListClientProps {
  problems: Problem[];
}
