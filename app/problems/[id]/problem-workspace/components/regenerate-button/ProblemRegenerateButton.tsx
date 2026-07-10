"use client";

import { useState, useRef, useCallback } from "react";
import type { Problem, ProblemDescription } from "@/types";
import { saveProblemNotes } from "@/app/problems/[id]/actions";

interface ProblemRegenerateButtonProps {
  problem: Problem;
  activeTab: string;
  hasDescription: boolean;
  hasNotes: boolean;
  hasSolution: boolean;
  solutionCode?: string;
  onDescriptionRegenerated: (desc: ProblemDescription) => void;
  onNotesRegenerated: (notes: string) => void;
}

type RegenerateState = "idle" | "confirming" | "generating";

export default function ProblemRegenerateButton({
  problem,
  activeTab,
  hasDescription,
  hasNotes,
  hasSolution,
  solutionCode,
  onDescriptionRegenerated,
  onNotesRegenerated,
}: ProblemRegenerateButtonProps) {
  const [state, setState] = useState<RegenerateState>("idle");
  const [progress, setProgress] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const handleConfirm = useCallback(async () => {
    setState("generating");
    setProgress("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      if (activeTab === "description") {
        const res = await fetch("/api/ai/problem/generate-description", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-stream": "true",
          },
          body: JSON.stringify({
            problemId: problem.id,
            title: problem.title,
            difficulty: problem.difficulty,
            patterns: problem.patterns,
            companies: problem.companies,
            url: problem.url,
            semanticDescription: problem.semanticDescription,
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          setState("idle");
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let lineCount = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === "token") {
                lineCount++;
                setProgress(`${lineCount} chunks`);
              } else if (event.type === "done") {
                onDescriptionRegenerated(event.description);
              }
            } catch {
              // Skip
            }
          }
        }
      } else if (activeTab === "notes") {
        const solutionPayload =
          solutionCode && solutionCode.trim()
            ? solutionCode
            : `// Problem: ${problem.title}\n// Difficulty: ${problem.difficulty}\n// Patterns: ${problem.patterns.join(", ")}`;

        const res = await fetch("/api/ai/problem/generate-note", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            solution: solutionPayload,
            title: problem.title,
            patterns: problem.patterns,
            difficulty: problem.difficulty,
            semanticDescription: problem.semanticDescription,
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          setState("idle");
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          const lines = accumulated.split("\n").length;
          setProgress(`${lines} lines`);
        }

        onNotesRegenerated(accumulated);
        await saveProblemNotes(problem.id, accumulated);
      }

      setState("idle");
      setProgress("");
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setState("idle");
        setProgress("");
      }
    } finally {
      abortRef.current = null;
    }
  }, [
    activeTab,
    problem,
    solutionCode,
    onDescriptionRegenerated,
    onNotesRegenerated,
  ]);

  // Only show for tabs that have existing content to regenerate
  const canRegenerate =
    (activeTab === "description" && hasDescription) ||
    (activeTab === "notes" && hasNotes);

  if (!canRegenerate) return null;

  const handleClick = () => {
    if (state === "idle") setState("confirming");
  };

  const handleCancel = () => {
    if (state === "confirming") {
      setState("idle");
    } else if (state === "generating") {
      abortRef.current?.abort();
      setState("idle");
      setProgress("");
    }
  };

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
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
      title="Regenerate this section with AI"
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
      Regenerate
    </button>
  );
}
