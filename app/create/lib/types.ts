import type { SemanticDescription } from "@/types";

export interface TopicFormData {
  title?: string;
  category?: string;
  difficulty?: string;
  tags?: string[];
  prerequisites?: string[];
  relatedTopics?: string[];
  estimatedMinutes?: number;
  semanticDescription?: SemanticDescription;
}

export interface ProblemFormData {
  title?: string;
  difficulty?: string;
  companies?: string[];
  patterns?: string[];
  url?: string;
  relatedTopicIds?: string[];
  semanticDescription?: SemanticDescription;
}

export type FormType = "topic" | "problem";
