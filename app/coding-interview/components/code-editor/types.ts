export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: "javascript" | "typescript";
  boilerplate: string;
  readOnly?: boolean;
}

export type CopyStatus = "idle" | "copied";
