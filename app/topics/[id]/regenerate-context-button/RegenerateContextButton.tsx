"use client";

import { useState, useCallback } from "react";
import type { SemanticDescription } from "@/types";

interface RegenerateContextButtonProps {
  topicId: string;
  hasExistingContext: boolean;
  onRegenerated: (semanticDescription: SemanticDescription) => void;
}

type ButtonState = "idle" | "confirming" | "generating";

export default function RegenerateContextButton({
  topicId,
  hasExistingContext,
  onRegenerated,
}: RegenerateContextButtonProps) {
  const [state, setState] = useState<ButtonState>("idle");
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    if (state === "idle") {
      if (hasExistingContext) {
        setState("confirming");
      } else {
        // No existing context — generate directly without confirmation
        handleGenerate();
      }
    }
  };

  const handleCancel = () => {
    setState("idle");
    setError(null);
  };

  const handleGenerate = useCallback(async () => {
    setState("generating");
    setError(null);

    try {
      const response = await fetch("/api/ai/topic/regenerate-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to generate AI context");
        setState("idle");
        return;
      }

      const data = await response.json();
      onRegenerated(data.semanticDescription);
      setState("idle");
    } catch {
      setError("Network error — please try again");
      setState("idle");
    }
  }, [topicId, onRegenerated]);

  if (state === "confirming") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-amber-600 dark:text-amber-400">
          Regenerate AI context?
        </span>
        <button
          onClick={handleGenerate}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 transition-colors"
        >
          Yes
        </button>
        <button
          onClick={handleCancel}
          className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (state === "generating") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 animate-pulse">
        <svg
          className="w-3 h-3 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
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
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        Generating...
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        title={
          hasExistingContext
            ? "Regenerate AI context from topic content"
            : "Generate AI context from topic content"
        }
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
            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
          />
        </svg>
        {hasExistingContext ? "Regenerate" : "Generate"}
      </button>
      {error && (
        <span className="text-xs text-red-500 dark:text-red-400">{error}</span>
      )}
    </div>
  );
}
