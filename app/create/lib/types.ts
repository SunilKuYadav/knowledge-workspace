export interface TopicFormData {
  title?: string;
  category?: string;
  difficulty?: string;
  tags?: string[];
  prerequisites?: string[];
  relatedTopics?: string[];
  estimatedMinutes?: number;
}

export interface ProblemFormData {
  title?: string;
  platform?: string;
  difficulty?: string;
  companies?: string[];
  patterns?: string[];
  url?: string;
  relatedTopicIds?: string[];
}

export type FormType = "topic" | "problem";
