export interface MarkdownEditorProps {
  content: string;
  filePath: string;
}

export type FormatAction =
  | "h1"
  | "h2"
  | "h3"
  | "bold"
  | "italic"
  | "code"
  | "codeblock"
  | "ul"
  | "ol"
  | "link"
  | "image";

export interface ToolbarButtonProps {
  label: string;
  onClick: () => void;
  className?: string;
}
