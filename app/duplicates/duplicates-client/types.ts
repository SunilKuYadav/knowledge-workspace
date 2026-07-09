import type { Topic } from "@/types";
import type { Problem } from "@/types";

export interface DuplicateGroup<T> {
  items: T[];
  reason: string;
  confidence: "high" | "medium" | "low";
  titleSimilarity: number;
  tagOverlap: number;
}

export interface DuplicatesResponse {
  topicDuplicates: DuplicateGroup<Topic>[];
  problemDuplicates: DuplicateGroup<Problem>[];
}

export interface MergeResult {
  success: boolean;
  message: string;
  primaryId: string;
}

export type TabType = "topics" | "problems";
