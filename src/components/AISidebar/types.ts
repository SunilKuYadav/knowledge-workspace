export interface AISidebarProps {
  context: "topic" | "problem";
  itemId: string;
  itemTitle?: string;
  available?: boolean;
}

export interface ActionConfig {
  id: string;
  label: string;
  action: string;
  streaming: boolean;
  filename: string;
  /** Whether this is a general question not tied to the current item */
  isGeneral?: boolean;
}

export interface PromptHelper {
  label: string;
  prompt: string;
}
