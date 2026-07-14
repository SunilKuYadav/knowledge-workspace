"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  drawSelection,
} from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import {
  indentOnInput,
  bracketMatching,
  syntaxHighlighting,
  HighlightStyle,
} from "@codemirror/language";
import { tags } from "@lezer/highlight";
import type { CodeChallengeQuestion } from "../../lib/types";

interface CodeEditorProps {
  question: CodeChallengeQuestion;
  onSubmit: (code: string) => void;
  isEvaluating: boolean;
}

/* ─── Theme Definitions ──────────────────────────────────── */

const darkTheme = EditorView.theme(
  {
    "&": { backgroundColor: "#1e1e1e", color: "#d4d4d4" },
    ".cm-content": { caretColor: "#aeafad" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#aeafad" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      { backgroundColor: "#264f78" },
    ".cm-gutters": {
      backgroundColor: "#1e1e1e",
      color: "#858585",
      borderRight: "1px solid #333333",
    },
    ".cm-activeLineGutter": { backgroundColor: "#2a2d2e" },
    ".cm-activeLine": { backgroundColor: "#2a2d2e80" },
  },
  { dark: true },
);

const lightTheme = EditorView.theme(
  {
    "&": { backgroundColor: "#ffffff", color: "#1e1e2e" },
    ".cm-content": { caretColor: "#1e1e2e" },
    ".cm-gutters": {
      backgroundColor: "#f8f9fa",
      color: "#6c757d",
      borderRight: "1px solid #e9ecef",
    },
    ".cm-activeLineGutter": { backgroundColor: "#f1f3f5" },
    ".cm-activeLine": { backgroundColor: "#f8f9fa80" },
  },
  { dark: false },
);

/* ─── VS Code Dark+ Syntax Highlighting (≥ 9:1 contrast on #1e1e1e) ─── */

const darkHighlightStyle = HighlightStyle.define([
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

export function CodeEditor({
  question,
  onSubmit,
  isEvaluating,
}: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [code, setCode] = useState("");
  const [showExamples, setShowExamples] = useState(true);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  const codeRef = useRef(code);
  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  // Subscribe to dark mode changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const langExtension = useMemo(() => {
    return javascript({ typescript: true, jsx: false });
  }, []);

  // Initialize CodeMirror
  useEffect(() => {
    if (!editorRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const doc = update.state.doc.toString();
        setCode(doc);
      }
    });

    const state = EditorState.create({
      doc: code,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        drawSelection(),
        bracketMatching(),
        closeBrackets(),
        indentOnInput(),
        syntaxHighlighting(darkHighlightStyle),
        langExtension,
        keymap.of([...closeBracketsKeymap, ...defaultKeymap, indentWithTab]),
        isDark ? darkTheme : lightTheme,
        EditorView.lineWrapping,
        updateListener,
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark, langExtension]);

  const handleSubmit = useCallback(() => {
    if (!codeRef.current.trim()) return;
    onSubmit(codeRef.current);
  }, [onSubmit]);

  return (
    <div className="flex flex-col gap-4">
      {/* Problem statement */}
      <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
        <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
          Problem Statement
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
          {question.problemStatement}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Input Format
            </span>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              {question.inputFormat}
            </p>
          </div>
          <div>
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Output Format
            </span>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              {question.outputFormat}
            </p>
          </div>
        </div>
      </div>

      {/* Examples (collapsible) */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowExamples((prev) => !prev)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors"
          aria-expanded={showExamples}
        >
          <span>Examples ({question.examples.length})</span>
          <svg
            className={`w-4 h-4 transition-transform ${showExamples ? "rotate-180" : ""}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        {showExamples && (
          <div className="p-4 space-y-3 bg-white dark:bg-zinc-900">
            {question.examples.map((example, idx) => (
              <div
                key={idx}
                className="p-3 rounded border border-zinc-100 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50"
              >
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div>
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Input
                    </span>
                    <pre className="text-xs text-zinc-700 dark:text-zinc-300 mt-0.5 font-mono whitespace-pre-wrap">
                      {example.input}
                    </pre>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      Expected Output
                    </span>
                    <pre className="text-xs text-zinc-700 dark:text-zinc-300 mt-0.5 font-mono whitespace-pre-wrap">
                      {example.expectedOutput}
                    </pre>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
                  {example.explanation}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Code editor */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <div className="px-3 py-2 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
            TypeScript
          </span>
        </div>
        <div
          ref={editorRef}
          className="min-h-[260px] overflow-auto"
        />
      </div>

      {/* Submit button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!code.trim() || isEvaluating}
          className="px-5 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isEvaluating ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Evaluating...
            </span>
          ) : (
            "Submit Code"
          )}
        </button>
      </div>
    </div>
  );
}
