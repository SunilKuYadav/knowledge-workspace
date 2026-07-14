"use client";

import Link from "next/link";
import { MarkdownRenderer } from "@/src/components/MarkdownRenderer";
import GenerateArtifactButton from "../generate-artifact-button";
import RegenerateArtifactButton from "../regenerate-artifact-button";
import TopicPractice from "../topic-practice";
import { useTopicTabs } from "./useTopicTabs";
import { ARTIFACT_ORDER } from "@/types";
import type { TopicTabsProps } from "./types";

/** Minimum artifacts required before the Practice tab is shown. */
const MIN_ARTIFACTS_FOR_PRACTICE = 3;

export default function TopicTabs({
  artifacts: initialArtifacts,
  editBasePath,
  topicId,
  topicTitle,
  topicCategory,
  tags,
  difficulty,
  semanticDescription,
  linkedProblems,
}: TopicTabsProps) {
  const {
    artifacts,
    activeTab,
    setActiveTab,
    handleGenerated,
    getLabel,
    artifactKeys,
  } = useTopicTabs(initialArtifacts);

  // Show Practice tab only when enough artifact content exists (at least 3 artifacts)
  // so AI has enough context to suggest meaningful problems.
  const showPracticeTab = artifactKeys.length >= MIN_ARTIFACTS_FOR_PRACTICE;
  const isPracticeActive = activeTab === "__practice__";

  // Build concatenated artifact content for the practice tab's AI context
  const artifactContent = ARTIFACT_ORDER
    .filter((key) => artifacts[key])
    .map((key) => `## ${getLabel(key)}\n\n${artifacts[key]}`)
    .join("\n\n---\n\n");

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

          {/* Practice tab — only shown when enough content exists */}
          {showPracticeTab && (
            <button
              role="tab"
              aria-selected={isPracticeActive}
              onClick={() => setActiveTab("__practice__")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                isPracticeActive
                  ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
              }`}
            >
              🧑‍💻 Practice
            </button>
          )}

          {/* AI generate button — only shown when missing artifacts exist */}
          <GenerateArtifactButton
            existingArtifacts={artifactKeys}
            topicId={topicId}
            topicTitle={topicTitle}
            topicCategory={topicCategory}
            semanticDescription={semanticDescription}
            onGenerated={handleGenerated}
          />
        </div>

        {/* Action buttons for the active tab (not for Practice) */}
        {activeTab && !isPracticeActive && (
          <div className="flex items-center gap-2 shrink-0">
            <RegenerateArtifactButton
              topicId={topicId}
              topicTitle={topicTitle}
              topicCategory={topicCategory}
              activeTab={activeTab}
              semanticDescription={semanticDescription}
              onRegenerated={handleGenerated}
            />
            <Link
              href={`${editBasePath}/${activeTab}.md`}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shrink-0"
            >
              Edit
            </Link>
          </div>
        )}
      </div>

      {/* Tab content */}
      {isPracticeActive ? (
        <TopicPractice
          topicId={topicId}
          topicTitle={topicTitle}
          topicCategory={topicCategory}
          tags={tags}
          difficulty={difficulty}
          artifactContent={artifactContent}
          semanticDescription={semanticDescription}
          linkedProblems={linkedProblems}
        />
      ) : artifactKeys.length === 0 ? (
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
