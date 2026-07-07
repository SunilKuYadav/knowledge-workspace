export interface TopicFormData {
  title?: string;
  category?: string;
  difficulty?: string;
  tags?: string[];
}

export interface ProblemFormData {
  title?: string;
  platform?: string;
  difficulty?: string;
  companies?: string[];
  patterns?: string[];
  url?: string;
}

export type FormType = "topic" | "problem";
