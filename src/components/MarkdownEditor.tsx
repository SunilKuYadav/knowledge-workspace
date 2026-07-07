"use client";

import { useState, useRef, useCallback, useTransition } from "react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { saveFile } from "@/app/edit/actions";

/* ─── AI Text Generation Hook ─── */
function useAIGenerate() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generate = useCallback(
    async (
      prompt: string,
      context: string,
      onChunk: (chunk: string) => void,
    ) => {
      setIsGenerating(true);
      try {
        const response = await fetch("/api/ai/generate-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, context }),
        });

        if (!response.ok || !response.body) {
          const err = await response.json().catch(() => ({}));
          throw new Error(
            (err as { error?: string }).error || "Failed to generate text",
          );
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          onChunk(text);
        }
      } finally {
        setIsGenerating(false);
      }
    },
    [],
  );

  return { generate, isGenerating };
}

interface MarkdownEditorProps {
  content: string;
  filePath: string;
}

type FormatAction =
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

export default function MarkdownEditor({
  content,
  filePath,
}: MarkdownEditorProps) {
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

  return (
    <div className="flex flex-col h-full min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-wrap">
        <ToolbarButton label="H1" onClick={() => insertFormatting("h1")} />
        <ToolbarButton label="H2" onClick={() => insertFormatting("h2")} />
        <ToolbarButton label="H3" onClick={() => insertFormatting("h3")} />
        <ToolbarDivider />
        <ToolbarButton
          label="B"
          onClick={() => insertFormatting("bold")}
          className="font-bold"
        />
        <ToolbarButton
          label="I"
          onClick={() => insertFormatting("italic")}
          className="italic"
        />
        <ToolbarButton label="Code" onClick={() => insertFormatting("code")} />
        <ToolbarButton
          label="{ }"
          onClick={() => insertFormatting("codeblock")}
        />
        <ToolbarDivider />
        <ToolbarButton label="• List" onClick={() => insertFormatting("ul")} />
        <ToolbarButton label="1. List" onClick={() => insertFormatting("ol")} />
        <ToolbarDivider />
        <ToolbarButton label="Link" onClick={() => insertFormatting("link")} />
        <ToolbarButton
          label="Image"
          onClick={() => insertFormatting("image")}
        />
        <ToolbarDivider />
        <button
          type="button"
          onClick={() => setShowAIPrompt((v) => !v)}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 transition-colors"
          aria-label="AI generate text"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"
            />
          </svg>
          AI
        </button>

        <div className="ml-auto flex items-center gap-3">
          {saveState === "saving" && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Saving...
            </span>
          )}
          {saveState === "saved" && (
            <span className="text-xs text-green-600 dark:text-green-400">
              Saved
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isPending}
            className="px-4 py-1.5 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Save
          </button>
        </div>
      </div>

      {/* AI Prompt Panel */}
      {showAIPrompt && (
        <div className="px-4 py-3 border-b border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30">
          <div className="flex items-center gap-2 mb-1.5">
            <svg
              className="w-4 h-4 text-indigo-600 dark:text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"
              />
            </svg>
            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
              AI Text Generator
            </span>
          </div>
          <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-2">
            Describe what you want to write and AI will generate markdown at the
            cursor position.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAIPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAIGenerate();
                }
                if (e.key === "Escape") {
                  setShowAIPrompt(false);
                }
              }}
              placeholder="e.g. Write a summary of binary search trees..."
              disabled={isGenerating}
              className="flex-1 px-3 py-1.5 text-sm rounded-md border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              autoFocus
            />
            <button
              onClick={handleAIGenerate}
              disabled={isGenerating || !aiPrompt.trim()}
              className="px-4 py-1.5 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? "Generating..." : "Generate"}
            </button>
            <button
              onClick={() => setShowAIPrompt(false)}
              className="px-3 py-1.5 text-sm rounded-md border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
          </div>
          {aiError && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              {aiError}
            </p>
          )}
        </div>
      )}

      {/* Editor and Preview Panes */}
      <div className="flex flex-1 min-h-0">
        {/* Editor Pane */}
        <div className="flex-1 flex flex-col border-r border-zinc-200 dark:border-zinc-800">
          <div className="px-4 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
            Editor
          </div>
          <textarea
            ref={textareaRef}
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            className="flex-1 w-full p-4 font-mono text-sm resize-none bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none"
            spellCheck={false}
            placeholder="Start writing Markdown..."
          />
        </div>

        {/* Preview Pane */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
            Preview
          </div>
          <div className="flex-1 overflow-y-auto p-4 prose prose-zinc dark:prose-invert max-w-none">
            <MarkdownRenderer>{markdown}</MarkdownRenderer>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({
  label,
  onClick,
  className = "",
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1 text-xs rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors ${className}`}
    >
      {label}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-1" />;
}
