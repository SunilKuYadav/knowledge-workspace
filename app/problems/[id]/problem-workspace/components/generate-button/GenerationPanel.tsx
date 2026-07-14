"use client";

import { MarkdownRenderer } from "@/src/components/MarkdownRenderer";
import type { GenerationState, BatchProgress, ProblemSection } from "./types";
import { PROBLEM_SECTION_LABELS } from "./types";

interface ProblemGenerationPanelProps {
  generation: GenerationState;
  batchProgress: BatchProgress | null;
  panelRef: React.RefObject<HTMLDivElement | null>;
  onCancel: () => void;
  onDismiss: () => void;
}

export function ProblemGenerationPanel({
  generation,
  batchProgress,
  panelRef,
  onCancel,
  onDismiss,
}: ProblemGenerationPanelProps) {
  if (generation.status === "idle") return null;

  const sectionLabel =
    PROBLEM_SECTION_LABELS[generation.section as ProblemSection] ??
    generation.section;

  const isBatch = batchProgress !== null;
  const batchDone =
    isBatch &&
    !batchProgress.active &&
    batchProgress.completed.length === batchProgress.total;

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
            {generation.status === "done" && !isBatch && (
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
            {generation.status === "done" && isBatch && !batchDone && (
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
            {batchDone && (
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
                `Generating ${sectionLabel}…`}
              {generation.status === "done" &&
                !isBatch &&
                `${sectionLabel} ready`}
              {generation.status === "done" &&
                isBatch &&
                !batchDone &&
                `${sectionLabel} ready — next up…`}
              {batchDone && `All sections generated`}
              {generation.status === "error" && `Generation failed`}
            </span>

            {isBatch && (
              <span className="ml-2 text-xs text-zinc-400 dark:text-zinc-500 font-mono">
                {batchProgress.completed.length}/{batchProgress.total}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {(generation.status === "generating" ||
              (isBatch && batchProgress.active)) && (
              <button
                onClick={onCancel}
                className="px-3 py-1.5 text-xs rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
            )}
            {((generation.status === "done" && !isBatch) ||
              (generation.status === "error" && !isBatch) ||
              (isBatch && !batchProgress.active)) && (
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

        {/* Batch progress bar */}
        {isBatch && (
          <div className="px-5 py-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${(batchProgress.completed.length / batchProgress.total) * 100}%`,
                  }}
                />
              </div>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                {batchProgress.completed.length} of {batchProgress.total} done
              </span>
            </div>
            {batchProgress.completed.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {batchProgress.completed.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                  >
                    <svg
                      className="w-3 h-3"
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
                    {PROBLEM_SECTION_LABELS[s as ProblemSection] ?? s}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Panel body */}
        <div ref={panelRef} className="flex-1 overflow-y-auto p-5">
          {generation.status === "error" ? (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
              <p className="text-sm text-red-700 dark:text-red-400">
                {generation.message}
              </p>
            </div>
          ) : (
            <div className="prose prose-zinc dark:prose-invert max-w-none text-sm">
              {generation.content ? (
                generation.section === "description" ? (
                  <pre className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap font-mono">
                    {generation.content}
                  </pre>
                ) : (
                  <MarkdownRenderer>{generation.content}</MarkdownRenderer>
                )
              ) : (
                <p className="text-zinc-400 italic">Starting generation…</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {generation.status === "done" && !isBatch && (
          <div className="shrink-0 px-5 py-3 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 rounded-b-xl">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              <strong className="text-zinc-700 dark:text-zinc-300">
                {sectionLabel}
              </strong>{" "}
              generated and saved.
            </p>
          </div>
        )}
        {batchDone && (
          <div className="shrink-0 px-5 py-3 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 rounded-b-xl">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              All {batchProgress.total} sections generated and saved.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
