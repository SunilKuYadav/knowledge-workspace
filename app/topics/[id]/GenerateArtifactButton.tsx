"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ARTIFACT_LABELS, ARTIFACT_ORDER } from "@/types";
import type { ArtifactType } from "@/types";
import { MarkdownRenderer } from "@/src/components/MarkdownRenderer";

interface GenerateArtifactButtonProps {
  /** Artifact keys that already exist — these are excluded from the dropdown. */
  existingArtifacts: string[];
  topicId: string;
  topicTitle: string;
  topicCategory: string;
  /** Called when generation finishes so the parent can add the new tab. */
  onGenerated: (artifact: string, content: string) => void;
}

type GenerationState =
  | { status: "idle" }
  | { status: "generating"; artifact: string; content: string }
  | { status: "done"; artifact: string; content: string }
  | { status: "error"; artifact: string; message: string };

export default function GenerateArtifactButton({
  existingArtifacts,
  topicId,
  topicTitle,
  topicCategory,
  onGenerated,
}: GenerateArtifactButtonProps) {
  const [open, setOpen] = useState(false);
  const [generation, setGeneration] = useState<GenerationState>({
    status: "idle",
  });

  const menuRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<AbortController | null>(null);

  // Missing artifacts = full ordered list minus what already exists
  const missing = ARTIFACT_ORDER.filter(
    (a) => !existingArtifacts.includes(a),
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const generate = useCallback(
    async (artifact: ArtifactType) => {
      setOpen(false);
      setGeneration({ status: "generating", artifact, content: "" });

      const controller = new AbortController();
      streamRef.current = controller;

      try {
        const response = await fetch("/api/ai/generate-artifact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topicId,
            artifact,
            topic: topicTitle,
            category: topicCategory,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          setGeneration({
            status: "error",
            artifact,
            message: (err as { error?: string }).error ?? "Generation failed",
          });
          return;
        }

        if (!response.body) {
          setGeneration({
            status: "error",
            artifact,
            message: "No response stream",
          });
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
          setGeneration({ status: "generating", artifact, content: accumulated });

          // Auto-scroll the panel
          panelRef.current?.scrollTo({
            top: panelRef.current.scrollHeight,
            behavior: "smooth",
          });
        }

        setGeneration({ status: "done", artifact, content: accumulated });
        onGenerated(artifact, accumulated);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setGeneration({
          status: "error",
          artifact,
          message: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        streamRef.current = null;
      }
    },
    [topicId, topicTitle, topicCategory, onGenerated],
  );

  const cancel = useCallback(() => {
    streamRef.current?.abort();
    setGeneration({ status: "idle" });
  }, []);

  const dismiss = useCallback(() => {
    setGeneration({ status: "idle" });
  }, []);

  if (missing.length === 0) return null;

  return (
    <>
      {/* "+" button with dropdown */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          disabled={generation.status === "generating"}
          className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 border-b-2 border-transparent hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Generate new artifact with AI"
          title="Generate artifact with AI"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
            />
          </svg>
          Generate
        </button>

        {open && (
          <div
            role="menu"
            className="absolute top-full left-0 mt-1 z-20 w-48 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg py-1"
          >
            <p className="px-3 py-1.5 text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">
              Generate with AI
            </p>
            {missing.map((artifact) => (
              <button
                key={artifact}
                role="menuitem"
                onClick={() => generate(artifact)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                {ARTIFACT_LABELS[artifact]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Generation panel — renders below the tab bar as an overlay */}
      {(generation.status === "generating" ||
        generation.status === "done" ||
        generation.status === "error") && (
        <GenerationPanel
          generation={generation}
          panelRef={panelRef}
          onCancel={cancel}
          onDismiss={dismiss}
        />
      )}
    </>
  );
}

interface GenerationPanelProps {
  generation: GenerationState;
  panelRef: React.RefObject<HTMLDivElement | null>;
  onCancel: () => void;
  onDismiss: () => void;
}

function GenerationPanel({
  generation,
  panelRef,
  onCancel,
  onDismiss,
}: GenerationPanelProps) {
  if (generation.status === "idle") return null;

  const artifactLabel =
    generation.artifact in ARTIFACT_LABELS
      ? ARTIFACT_LABELS[generation.artifact as ArtifactType]
      : generation.artifact;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-3xl mx-4 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl flex flex-col max-h-[80vh]">
        {/* Panel header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-200 dark:border-zinc-700 shrink-0">
          <div className="flex items-center gap-2">
            {generation.status === "generating" && (
              <span className="flex gap-1">
                <span
                  className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </span>
            )}
            {generation.status === "done" && (
              <svg
                className="w-4 h-4 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m4.5 12.75 6 6 9-13.5"
                />
              </svg>
            )}
            {generation.status === "error" && (
              <svg
                className="w-4 h-4 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                />
              </svg>
            )}
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {generation.status === "generating" &&
                `Generating ${artifactLabel}…`}
              {generation.status === "done" &&
                `${artifactLabel} ready`}
              {generation.status === "error" && `Generation failed`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {generation.status === "generating" && (
              <button
                onClick={onCancel}
                className="px-3 py-1.5 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
            )}
            {(generation.status === "done" ||
              generation.status === "error") && (
              <button
                onClick={onDismiss}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded transition-colors"
                aria-label="Close"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Panel body */}
        <div
          ref={panelRef}
          className="flex-1 overflow-y-auto p-5"
        >
          {generation.status === "error" ? (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
              <p className="text-sm text-red-700 dark:text-red-400">
                {generation.message}
              </p>
            </div>
          ) : (
            <div className="prose prose-zinc dark:prose-invert max-w-none text-sm">
              {generation.content ? (
                <MarkdownRenderer>{generation.content}</MarkdownRenderer>
              ) : (
                <p className="text-zinc-400 italic">Starting generation…</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {generation.status === "done" && (
          <div className="shrink-0 px-5 py-3 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 rounded-b-xl">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Saved to{" "}
              <code className="text-xs bg-zinc-200 dark:bg-zinc-700 px-1 py-0.5 rounded">
                {generation.artifact}.md
              </code>
              . The{" "}
              <strong className="text-zinc-700 dark:text-zinc-300">
                {artifactLabel}
              </strong>{" "}
              tab is now available.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
