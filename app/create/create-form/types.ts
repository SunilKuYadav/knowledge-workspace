import type { TopicFormData, ProblemFormData, FormType } from "../lib";

export type Tab = "topic" | "problem";

export interface AIAssistProps {
  formType: FormType;
  onResult: (data: TopicFormData | ProblemFormData) => void;
}
