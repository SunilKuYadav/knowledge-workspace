import type { Topic } from "@/src/types";

export type DifficultyFilter = "" | "easy" | "medium" | "hard";
export type StatusFilter = "" | "not-started" | "in-progress" | "completed";
export type CategoryFilter = "" | "dsa" | "system-design" | "database" | "networking" | "os" | "oop";

export interface TopicsListClientProps {
  topics: Topic[];
}
