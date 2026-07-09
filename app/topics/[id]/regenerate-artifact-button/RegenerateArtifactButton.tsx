"use client";

import { useState, useRef, useCallback } from "react";
import type { ArtifactType } from "@/types";
import { ArtifactSchema } from "@/types";

interface RegenerateArtifactButtonProps {
  topicId: string;
  topicTitle: string;
  topicCategory: string;
  activeTab: string;
  onRegenerated: (artifact: string, content: string) => void;
}

type RegenerateState = "idle" | "confirming" | "generating";

export default function RegenerateArtifactButton({
  topicId,
  topicTitle,
  topicCategory,
  activeTab,
  onRegenerated,
}: RegenerateArtifactButtonProps) {
  const [state, setState] = useState<RegenerateState>("idle");
  const [progress, setProgress] = useState("");
  const streamRef = useRef<AbortController | null>(null);

  // Only show for valid artifact types
  const parsed = ArtifactSchema.safeParse(activeTab);
  if (!parsed.success) return null;

  const handleClick = () => {
    if (state === "idle") {
      setState("confirming");
    }
  };

  const handleCancel = () => {
    if (state === "confirming") {
      setState("idle");
    } else if (state === "generating") {
      streamRef.current?.abort();
      setState("idle");
      setProgress("");
    }
  };

  const handleConfirm = useCallback(async () => {
    setState("generating");
    setProgress("");

    const controller = new AbortController();
    streamRef.current = controller;

    try {
      const response = await fetch("/api/ai/generate-artifact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicId,
          artifact: activeTab,
          topic: topicTitle,
          category: topicCategory,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        setState("idle");
        return;
      }

      if (!response.body) {
        setState("idle");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        // Show progress indicator
        const lines = accumulated.split("\n").length;
        setProgress(`${lines} lines`);
      }

      onRegenerated(activeTab, accumulated);
      setState("idle");
      setProgress("");
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setState("idle");
        setProgress("");
      }
    } finally {
      streamRef.current = null;
    }
  }, [topicId, topicTitle, topicCategory, activeTab, onRegenerated]);

  if (state === "confirming") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-amber-600 dark:text-amber-400">
          Overwrite current content?
        </span>
        <button
          onClick={handleConfirm}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 transition-colors"
        >
          Yes, regenerate
        </button>
        <button
          onClick={handleCancel}
          className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-md border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (state === "generating") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-blue-600 dark:text-blue-400 animate-pulse">
          Regenerating{progress ? ` (${progress})` : "..."}
        </span>
        <button
          onClick={handleCancel}
          className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-md border border-zinc-300 dark:border-zinc-600 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
      title="Regenerate this tab's content with AI"
    >
      <svg
        className="w-4 h-4"
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
      Regenerate
    </button>
  );
}
