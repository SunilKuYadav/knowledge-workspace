"use client";

import { ARTIFACT_LABELS } from "@/types";
import type { ArtifactType } from "@/types";
import { useGenerateArtifactButton } from "./useGenerateArtifactButton";
import { GenerationPanel } from "./components/GenerationPanel";
import type { GenerateArtifactButtonProps } from "./types";

export default function GenerateArtifactButton({
  existingArtifacts,
  topicId,
  topicTitle,
  topicCategory,
  semanticDescription,
  onGenerated,
}: GenerateArtifactButtonProps) {
  const {
    open,
    setOpen,
    generation,
    menuRef,
    panelRef,
    missing,
    generate,
    cancel,
    dismiss,
  } = useGenerateArtifactButton(
    existingArtifacts,
    topicId,
    topicTitle,
    topicCategory,
    onGenerated,
    semanticDescription,
  );

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
