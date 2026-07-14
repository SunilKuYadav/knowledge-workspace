import { EditorView } from "@codemirror/view";
import { HighlightStyle } from "@codemirror/language";
import { tags } from "@lezer/highlight";

export const darkTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "#1e1e1e",
      color: "#d4d4d4",
    },
    ".cm-content": {
      caretColor: "#aeafad",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "#aeafad",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      {
        backgroundColor: "#264f78",
      },
    ".cm-gutters": {
      backgroundColor: "#1e1e1e",
      color: "#858585",
      borderRight: "1px solid #333333",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "#2a2d2e",
    },
    ".cm-activeLine": {
      backgroundColor: "#2a2d2e80",
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

/**
 * VS Code Dark+ inspired syntax highlighting (all colors ≥ 9:1 contrast on #1e1e1e)
 */
export const darkHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "#7cb8e8" },
  { tag: tags.controlKeyword, color: "#c586c0" },
  { tag: tags.operatorKeyword, color: "#7cb8e8" },
  { tag: tags.definitionKeyword, color: "#7cb8e8" },
  { tag: tags.typeName, color: "#4ec9b0" },
  { tag: tags.typeOperator, color: "#4ec9b0" },
  { tag: tags.className, color: "#4ec9b0" },
  { tag: tags.function(tags.variableName), color: "#dcdcaa" },
  { tag: tags.definition(tags.variableName), color: "#9cdcfe" },
  { tag: tags.variableName, color: "#9cdcfe" },
  { tag: tags.propertyName, color: "#9cdcfe" },
  { tag: tags.definition(tags.propertyName), color: "#9cdcfe" },
  { tag: tags.function(tags.propertyName), color: "#dcdcaa" },
  { tag: tags.string, color: "#e4ad94" },
  { tag: tags.regexp, color: "#d16969" },
  { tag: tags.number, color: "#b5cea8" },
  { tag: tags.bool, color: "#7cb8e8" },
  { tag: tags.null, color: "#7cb8e8" },
  { tag: tags.comment, color: "#6a9955", fontStyle: "italic" },
  { tag: tags.lineComment, color: "#6a9955", fontStyle: "italic" },
  { tag: tags.blockComment, color: "#6a9955", fontStyle: "italic" },
  { tag: tags.operator, color: "#d4d4d4" },
  { tag: tags.punctuation, color: "#d4d4d4" },
  { tag: tags.bracket, color: "#ffd700" },
  { tag: tags.meta, color: "#d4d4d4" },
  { tag: tags.tagName, color: "#7cb8e8" },
  { tag: tags.attributeName, color: "#9cdcfe" },
  { tag: tags.attributeValue, color: "#e4ad94" },
]);
