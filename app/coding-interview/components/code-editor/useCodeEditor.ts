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
} from "@codemirror/language";
import { formatCode } from "../../services/formatService";
import { darkTheme, lightTheme, darkHighlightStyle } from "./constants";
import type { CodeEditorProps, CopyStatus } from "./types";

export function useCodeEditor({
  value,
  onChange,
  language,
  boilerplate,
  readOnly = false,
}: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);

  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const [formatError, setFormatError] = useState<string | null>(null);

  // Keep onChange ref current
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Toggle fullscreen with F11 key, exit with Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "F11") {
        e.preventDefault();
        setIsFullscreen((prev) => !prev);
      }
      if (e.key === "Escape" && isFullscreen) {
        e.preventDefault();
        setIsFullscreen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Subscribe to dark mode changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Language extension
  const langExtension = useMemo(() => {
    return javascript({ typescript: language === "typescript", jsx: true });
  }, [language]);

  // Initialize CodeMirror
  useEffect(() => {
    if (!editorRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const doc = update.state.doc.toString();
        onChangeRef.current(doc);
      }
    });

    const state = EditorState.create({
      doc: value,
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
        EditorState.readOnly.of(readOnly),
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
    // We intentionally re-create the editor when theme or language changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark, langExtension, readOnly, isFullscreen]);

  // Sync external value changes into the editor
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const currentContent = view.state.doc.toString();
    if (currentContent !== value) {
      view.dispatch({
        changes: { from: 0, to: currentContent.length, insert: value },
      });
    }
  }, [value]);

  /* ─── Toolbar Actions ──────────────────────────────────── */

  const handleCopy = useCallback(async () => {
    const view = viewRef.current;
    if (!view) return;

    const text = view.state.doc.toString();
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      setCopyStatus("idle");
    }
  }, []);

  const handleReset = useCallback(() => {
    if (
      window.confirm("Reset editor to boilerplate code? This cannot be undone.")
    ) {
      onChange(boilerplate);
    }
  }, [boilerplate, onChange]);

  const handleFormat = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;

    const code = view.state.doc.toString();
    const lang = language === "typescript" ? "typescript" : "javascript";
    const result = formatCode(code, lang);

    if (result.error) {
      setFormatError(result.error);
      setTimeout(() => setFormatError(null), 4000);
    } else {
      setFormatError(null);
      onChange(result.formatted);
    }
  }, [language, onChange]);

  const handleFullscreenToggle = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  return {
    editorRef,
    isFullscreen,
    copyStatus,
    formatError,
    handleCopy,
    handleReset,
    handleFormat,
    handleFullscreenToggle,
    language,
    readOnly,
  };
}
