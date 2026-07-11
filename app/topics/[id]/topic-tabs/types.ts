export interface TopicTabsProps {
  artifacts: Record<string, string>;
  editBasePath: string;
  topicId: string;
  topicTitle: string;
  topicCategory: string;
  tags: string[];
  difficulty: string;
  semanticDescription?: import("@/types").SemanticDescription;
}
