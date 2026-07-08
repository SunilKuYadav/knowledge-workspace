"use client";

import { useState } from "react";
import { parseFormWithAI, enhancePromptWithAI } from "../../lib";
import type { TopicFormData, ProblemFormData, FormType } from "../../lib";

interface AIAssistProps {
  formType: FormType;
  onResult: (data: TopicFormData | ProblemFormData) => void;
}

export function AIAssist({ formType, onResult }: AIAssistProps) {
  const [text, setText] = useState("");
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [showEnhanced, setShowEnhanced] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [filling, setFilling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEnhance() {
    if (!text.trim()) return;
    setEnhancing(true);
    setError(null);

    try {
      const enhanced = await enhancePromptWithAI(text, formType);
      setEnhancedPrompt(enhanced);
      setShowEnhanced(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to enhance prompt",
      );
    } finally {
      setEnhancing(false);
    }
  }

  async function handleFillForm() {
    const promptToUse = showEnhanced ? enhancedPrompt : text;
    if (!promptToUse.trim()) return;
    setFilling(true);
    setError(null);

    try {
      const data = await parseFormWithAI(promptToUse, formType);
      onResult(data);
      setText("");
      setEnhancedPrompt("");
      setShowEnhanced(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to connect to AI service",
      );
    } finally {
      setFilling(false);
    }
  }

  function handleSkipEnhance() {
    setShowEnhanced(false);
    setEnhancedPrompt("");
    handleFillForm();
  }

  function handleReset() {
    setShowEnhanced(false);
    setEnhancedPrompt("");
    setError(null);
  }

  const isLoading = enhancing || filling;

  return (
    <div className="mb-6 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30 p-4">
      <div className="flex items-center gap-2 mb-2">
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
          Ask AI to fill the form
        </span>
      </div>
      <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-3">
        Describe what you want to create. AI will refine your prompt first, then
        populate the fields.
      </p>

      {/* Input area */}
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleEnhance();
            }
          }}
          placeholder={
            formType === "topic"
              ? 'e.g., "A hard DSA topic about graph traversal with tags bfs and dfs"'
              : 'e.g., "Two Sum from LeetCode, easy, asked at Google and Amazon, uses hash map pattern"'
          }
          className="flex-1 rounded-md border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          disabled={isLoading}
        />
        <button
          type="button"
          onClick={handleEnhance}
          disabled={isLoading || !text.trim()}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {enhancing ? "Enhancing..." : "Generate Prompt"}
        </button>
        <button
          type="button"
          onClick={handleSkipEnhance}
          disabled={isLoading || !text.trim()}
          className="rounded-md border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {filling && !showEnhanced ? "Filling..." : "Fill Directly"}
        </button>
      </div>

      {/* Enhanced prompt preview */}
      {showEnhanced && enhancedPrompt && (
        <div className="mt-3 rounded-md border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 p-3">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
              Enhanced Prompt
            </span>
          </div>
          <textarea
            value={enhancedPrompt}
            onChange={(e) => setEnhancedPrompt(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-y"
          />
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={handleFillForm}
              disabled={filling || !enhancedPrompt.trim()}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {filling ? "Filling..." : "Use This & Fill Form"}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={filling}
              className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
