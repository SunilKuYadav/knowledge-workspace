"use client";

import { useProblemGenerateButton } from "./useProblemGenerateButton";
import { ProblemGenerationPanel } from "./GenerationPanel";
import { PROBLEM_SECTION_LABELS } from "./types";
import type { ProblemGenerateButtonProps } from "./types";

export default function ProblemGenerateButton({
  problem,
  hasDescription,
  hasNotes,
  hasSolution,
  solutionCode,
  onDescriptionGenerated,
  onNotesGenerated,
}: ProblemGenerateButtonProps) {
  const {
    open,
    setOpen,
    generation,
    batchProgress,
    menuRef,
    panelRef,
    missing,
    generate,
    generateAll,
    cancel,
    dismiss,
  } = useProblemGenerateButton(
    problem,
    hasDescription,
    hasNotes,
    hasSolution,
    onDescriptionGenerated,
    onNotesGenerated,
    solutionCode,
  );

  if (missing.length === 0) return null;

  return (
    <>
      {/* Generate button with dropdown */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          disabled={generation.status === "generating"}
          className="inline-flex items-center gap-1 px-3 py-3 text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 border-b-2 border-transparent hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Generate content with AI"
          title="Generate content with AI"
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
            className="absolute top-full left-0 mt-1 z-20 w-52 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg py-1"
          >
            <p className="px-3 py-1.5 text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">
              Generate with AI
            </p>

            {/* Generate All Remaining */}
            {missing.length > 1 && (
              <button
                role="menuitem"
                onClick={() => generateAll()}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors text-left border-b border-zinc-100 dark:border-zinc-800 mb-1"
              >
                <svg
                  className="w-3.5 h-3.5 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z"
                  />
                </svg>
                Generate All ({missing.length})
              </button>
            )}

            {missing.map((section) => (
              <button
                key={section}
                role="menuitem"
                onClick={() => generate(section)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                {PROBLEM_SECTION_LABELS[section]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Generation panel overlay */}
      {(generation.status === "generating" ||
        generation.status === "done" ||
        generation.status === "error") && (
        <ProblemGenerationPanel
          generation={generation}
          batchProgress={batchProgress}
          panelRef={panelRef}
          onCancel={cancel}
          onDismiss={dismiss}
        />
      )}
    </>
  );
}
