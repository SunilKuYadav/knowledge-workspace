import type { LinkedPracticeProblem } from "../topic-practice/types";

export interface TopicTabsProps {
  artifacts: Record<string, string>;
  editBasePath: string;
  topicId: string;
  topicTitle: string;
  topicCategory: string;
  tags: string[];
  difficulty: string;
  semanticDescription?: import("@/types").SemanticDescription;
  /** Linked problems with description data for inline practice */
  linkedProblems: LinkedPracticeProblem[];
}
