import type { SemanticDescription } from "@/types";

export interface SemanticDescriptionEditorProps {
  /** Current value */
  value: SemanticDescription | undefined;
  /** Called when the user updates any field */
  onChange: (value: SemanticDescription | undefined) => void;
  /** Whether the section starts expanded */
  defaultExpanded?: boolean;
}
