import { EditorView } from "@codemirror/view";

export const darkTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "#1e1e2e",
      color: "#cdd6f4",
    },
    ".cm-content": {
      caretColor: "#f5e0dc",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "#f5e0dc",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      {
        backgroundColor: "#45475a",
      },
    ".cm-gutters": {
      backgroundColor: "#181825",
      color: "#6c7086",
      borderRight: "1px solid #313244",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "#1e1e2e",
    },
    ".cm-activeLine": {
      backgroundColor: "#1e1e2e80",
    },
  },
  { dark: true },
);

export const lightTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "#ffffff",
      color: "#1e1e2e",
    },
    ".cm-content": {
      caretColor: "#1e1e2e",
    },
    ".cm-gutters": {
      backgroundColor: "#f8f9fa",
      color: "#6c757d",
      borderRight: "1px solid #e9ecef",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "#f1f3f5",
    },
    ".cm-activeLine": {
      backgroundColor: "#f8f9fa80",
    },
  },
  { dark: false },
);
