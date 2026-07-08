"use client";

import { ARTIFACT_LABELS } from "@/types";
import type { ArtifactType } from "@/types";
import { MarkdownRenderer } from "@/src/components/MarkdownRenderer";
import type { GenerationPanelProps } from "../types";

export function GenerationPanel({
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
