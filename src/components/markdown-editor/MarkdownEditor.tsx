"use client";

import { MarkdownRenderer } from "../markdown-renderer";
import { ToolbarButton } from "./components/ToolbarButton";
import { ToolbarDivider } from "./components/ToolbarDivider";
import { useMarkdownEditor } from "./useMarkdownEditor";
import type { MarkdownEditorProps } from "./types";

export default function MarkdownEditor({
  content,
  filePath,
}: MarkdownEditorProps) {
  const {
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
  } = useMarkdownEditor(content, filePath);

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
