"use client";

import { useState, useRef, useCallback, useTransition } from "react";
import { saveFile } from "@/app/edit/actions";
import { useAIGenerate } from "./useAIGenerate";
import type { FormatAction } from "./types";

export function useMarkdownEditor(content: string, filePath: string) {
  const [markdown, setMarkdown] = useState(content);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // AI helper state
  const [showAIPrompt, setShowAIPrompt] = useState(false);
  const [aiPrompt, setAIPrompt] = useState("");
  const [aiError, setAIError] = useState<string | null>(null);
  const { generate, isGenerating } = useAIGenerate();

  const handleAIGenerate = useCallback(async () => {
    if (!aiPrompt.trim() || isGenerating) return;
    setAIError(null);

    const textarea = textareaRef.current;
    const insertPos = textarea ? textarea.selectionStart : markdown.length;

    // We'll collect chunks and append to markdown at the cursor position
    let generated = "";
    try {
      await generate(aiPrompt.trim(), markdown, (chunk) => {
        generated += chunk;
        const newContent =
          markdown.slice(0, insertPos) + generated + markdown.slice(insertPos);
        setMarkdown(newContent);
      });
      setAIPrompt("");
      setShowAIPrompt(false);
    } catch (err) {
      setAIError(err instanceof Error ? err.message : "Generation failed");
    }
  }, [aiPrompt, isGenerating, generate, markdown]);

  const insertFormatting = useCallback(
    (action: FormatAction) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = markdown.slice(start, end);
      let insertion = "";
      let cursorOffset = 0;

      switch (action) {
        case "h1":
          insertion = `# ${selected || "Heading 1"}`;
          cursorOffset = selected ? insertion.length : 2;
          break;
        case "h2":
          insertion = `## ${selected || "Heading 2"}`;
          cursorOffset = selected ? insertion.length : 3;
          break;
        case "h3":
          insertion = `### ${selected || "Heading 3"}`;
          cursorOffset = selected ? insertion.length : 4;
          break;
        case "bold":
          insertion = `**${selected || "bold text"}**`;
          cursorOffset = selected ? insertion.length : 2;
          break;
        case "italic":
          insertion = `*${selected || "italic text"}*`;
          cursorOffset = selected ? insertion.length : 1;
          break;
        case "code":
          insertion = `\`${selected || "code"}\``;
          cursorOffset = selected ? insertion.length : 1;
          break;
        case "codeblock":
          insertion = `\n\`\`\`\n${selected || "code here"}\n\`\`\`\n`;
          cursorOffset = selected ? insertion.length : 5;
          break;
        case "ul":
          insertion = `\n- ${selected || "list item"}`;
          cursorOffset = selected ? insertion.length : 3;
          break;
        case "ol":
          insertion = `\n1. ${selected || "list item"}`;
          cursorOffset = selected ? insertion.length : 4;
          break;
        case "link":
          insertion = selected ? `[${selected}](url)` : `[link text](url)`;
          cursorOffset = selected ? insertion.length - 4 : 1;
          break;
        case "image":
          insertion = selected ? `![${selected}](url)` : `![alt text](url)`;
          cursorOffset = selected ? insertion.length - 4 : 2;
          break;
      }

      const newContent =
        markdown.slice(0, start) + insertion + markdown.slice(end);
      setMarkdown(newContent);

      // Restore cursor position after state update
      requestAnimationFrame(() => {
        textarea.focus();
        const newCursorPos = start + cursorOffset;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      });
    },
    [markdown],
  );

  const handleSave = useCallback(() => {
    setSaveState("saving");
    startTransition(async () => {
      try {
        await saveFile(filePath, markdown);
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 2000);
      } catch (error) {
        console.error("Failed to save file:", error);
        setSaveState("idle");
      }
    });
  }, [filePath, markdown]);

  return {
    markdown,
    setMarkdown,
    saveState,
    isPending,
    textareaRef,
    showAIPrompt,
    setShowAIPrompt,
    aiPrompt,
    setAIPrompt,
    aiError,
    isGenerating,
    handleAIGenerate,
    insertFormatting,
    handleSave,
  };
}
