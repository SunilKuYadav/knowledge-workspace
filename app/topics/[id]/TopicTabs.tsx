"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { MarkdownRenderer } from "@/src/components/MarkdownRenderer";
import { ARTIFACT_LABELS } from "@/types";
import type { ArtifactType } from "@/types";
import GenerateArtifactButton from "./GenerateArtifactButton";

interface TopicTabsProps {
  /**
   * Map of artifact name → markdown content.
   * Only present artifacts are included — the component renders
   * whatever it receives, no hardcoded list.
   */
  artifacts: Record<string, string>;
  editBasePath: string;
  /** Topic metadata passed to the AI generator. */
  topicId: string;
  topicTitle: string;
  topicCategory: string;
}

export default function TopicTabs({
  artifacts: initialArtifacts,
  editBasePath,
  topicId,
  topicTitle,
  topicCategory,
}: TopicTabsProps) {
  // Local state so newly generated artifacts appear without a page reload
  const [artifacts, setArtifacts] =
    useState<Record<string, string>>(initialArtifacts);
  const [activeTab, setActiveTab] = useState<string>(
    () => Object.keys(initialArtifacts)[0] ?? "",
  );

  const artifactKeys = Object.keys(artifacts);

  /** Called by GenerateArtifactButton when generation completes. */
  const handleGenerated = useCallback((artifact: string, content: string) => {
    setArtifacts((prev) => ({ ...prev, [artifact]: content }));
    setActiveTab(artifact);
  }, []);

  /**
   * Resolve a human-readable label for an artifact.
   * Falls back to title-casing the key for unknown artifact names.
   */
  function getLabel(key: string): string {
    if (key in ARTIFACT_LABELS) {
      return ARTIFACT_LABELS[key as ArtifactType];
    }
    return key.charAt(0).toUpperCase() + key.slice(1).replace(/-/g, " ");
  }

  return (
    <div>
      {/* Tab navigation */}
      <div
        className="flex items-center border-b border-zinc-200 dark:border-zinc-700 mb-6"
        role="tablist"
      >
        <div className="flex flex-1 flex-wrap items-end gap-0">
          {artifactKeys.map((key) => (
            <button
              key={key}
              role="tab"
              aria-selected={activeTab === key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key
                  ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
              }`}
            >
              {getLabel(key)}
            </button>
          ))}

          {/* AI generate button — only shown when missing artifacts exist */}
          <GenerateArtifactButton
            existingArtifacts={artifactKeys}
            topicId={topicId}
            topicTitle={topicTitle}
            topicCategory={topicCategory}
            onGenerated={handleGenerated}
          />
        </div>

        {/* Edit button for the active tab (only shown when a tab is active) */}
        {activeTab && (
          <Link
            href={`${editBasePath}/${activeTab}.md`}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shrink-0"
          >
            Edit
          </Link>
        )}
      </div>

      {/* Tab content */}
      {artifactKeys.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-zinc-400 dark:text-zinc-500 italic mb-2">
            No content yet.
          </p>
          <p className="text-sm text-zinc-400 dark:text-zinc-500">
            Use the{" "}
            <span className="font-medium text-indigo-600 dark:text-indigo-400">
              Generate
            </span>{" "}
            button above to create content with AI, or edit a file manually.
          </p>
        </div>
      ) : (
        <div
          className="prose prose-zinc dark:prose-invert max-w-none"
          role="tabpanel"
          aria-label={getLabel(activeTab)}
        >
          {artifacts[activeTab] ? (
            <MarkdownRenderer>{artifacts[activeTab]}</MarkdownRenderer>
          ) : (
            <p className="text-zinc-400 dark:text-zinc-500 italic">
              No content yet. Click Edit to add content.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
