"use client";

import { useActionState, useState, useCallback } from "react";
import { createTopic, quickCreateTopic } from "../../actions";
import type { CreateTopicState } from "../../actions";
import type { TopicFormData, ProblemFormData, TopicCreationAssistResult } from "../../lib";
import { getTopicCreationAssist } from "../../lib";
import { AIAssist } from "./AIAssist";

export function TopicForm() {
  const [state, formAction, isPending] = useActionState<
    CreateTopicState,
    FormData
  >(createTopic, {});
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [tags, setTags] = useState("");
  const [prerequisites, setPrerequisites] = useState("");
  const [relatedTopics, setRelatedTopics] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [overview, setOverview] = useState("");

  // AI assist state
  const [assistLoading, setAssistLoading] = useState(false);
  const [assistResult, setAssistResult] = useState<TopicCreationAssistResult | null>(null);
  const [assistError, setAssistError] = useState<string | null>(null);

  // Quick-create state: tracks which suggested topics have been created
  const [createdTopics, setCreatedTopics] = useState<Record<string, string>>({});
  const [creatingTopic, setCreatingTopic] = useState<string | null>(null);

  function handleAIResult(data: TopicFormData | ProblemFormData) {
    const d = data as TopicFormData;
    if (d.title) setTitle(d.title);
    if (d.category) setCategory(d.category);
    if (d.difficulty) setDifficulty(d.difficulty);
    if (d.tags) setTags(d.tags.join(", "));
  }

  const handleGetSuggestions = useCallback(async () => {
    if (!title.trim() || !category || !difficulty) {
      setAssistError("Please fill in title, category, and difficulty first.");
      return;
    }

    setAssistLoading(true);
    setAssistError(null);
    setAssistResult(null);

    try {
      const result = await getTopicCreationAssist({
        title: title.trim(),
        category,
        difficulty,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
      setAssistResult(result);

      // Auto-fill suggestions
      if (result.prerequisites.length > 0) {
        setPrerequisites(result.prerequisites.join(", "));
      }
      if (result.relatedTopics.length > 0) {
        setRelatedTopics(result.relatedTopics.join(", "));
      }
      if (result.estimatedMinutes) {
        setEstimatedMinutes(String(result.estimatedMinutes));
      }
      if (result.overview) {
        setOverview(result.overview);
      }
    } catch (err) {
      setAssistError(
        err instanceof Error ? err.message : "Failed to get suggestions",
      );
    } finally {
      setAssistLoading(false);
    }
  }, [title, category, difficulty, tags]);

  const handleQuickCreateTopic = useCallback(
    async (topicTitle: string) => {
      setCreatingTopic(topicTitle);
      try {
        // Use the current category as default for prerequisites
        const cat = (category || "dsa") as "dsa" | "system-design" | "database" | "networking" | "os" | "oop";
        const result = await quickCreateTopic(topicTitle, cat, "medium");
        if (result.topic) {
          setCreatedTopics((prev) => ({ ...prev, [topicTitle]: result.topic!.id }));
          // Add the new topic ID to prerequisites
          setPrerequisites((prev) => {
            const existing = prev
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            if (!existing.includes(result.topic!.id)) {
              existing.push(result.topic!.id);
            }
            return existing.join(", ");
          });
        } else if (result.error) {
          setAssistError(result.error);
        }
      } catch (err) {
        setAssistError(
          err instanceof Error ? err.message : "Failed to create topic",
        );
      } finally {
        setCreatingTopic(null);
      }
    },
    [category],
  );

  return (
    <div className="max-w-2xl">
      <AIAssist formType="topic" onResult={handleAIResult} />

      <form action={formAction} className="space-y-5">
        {state.error && (
          <div
            role="alert"
            className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300"
          >
            {state.error}
          </div>
        )}

        <div>
          <label
            htmlFor="topic-title"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
          >
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="topic-title"
            name="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Graph Traversal"
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="topic-category"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
          >
            Category <span className="text-red-500">*</span>
          </label>
          <select
            id="topic-category"
            name="category"
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select a category</option>
            <option value="dsa">DSA</option>
            <option value="system-design">System Design</option>
            <option value="database">Database</option>
            <option value="networking">Networking</option>
            <option value="os">Operating Systems</option>
            <option value="oop">OOP</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="topic-difficulty"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
          >
            Difficulty <span className="text-red-500">*</span>
          </label>
          <select
            id="topic-difficulty"
            name="difficulty"
            required
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select difficulty</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="topic-tags"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
          >
            Tags
          </label>
          <input
            id="topic-tags"
            name="tags"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g., graphs, bfs, dfs (comma-separated)"
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Separate multiple tags with commas
          </p>
        </div>

        {/* AI Suggest Button */}
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🧠</span>
              <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                AI Study Assistant
              </span>
            </div>
            <button
              type="button"
              onClick={handleGetSuggestions}
              disabled={assistLoading || !title.trim() || !category || !difficulty}
              className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {assistLoading ? "Analyzing..." : "Suggest Prerequisites & Overview"}
            </button>
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Fill in title, category, and difficulty, then click to get AI-suggested
            prerequisites, related topics, time estimate, and a skeleton overview.
          </p>
          {assistError && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">{assistError}</p>
          )}
        </div>

        {/* AI Suggestions Display */}
        {assistResult && (
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 p-4 space-y-3">
            <h4 className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              ✓ AI Suggestions Applied
            </h4>

            {assistResult.suggestedPrerequisites.length > 0 && (
              <div>
                <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">
                  💡 Topics you might want to add to your workspace first:
                </p>
                <div className="space-y-1.5">
                  {assistResult.suggestedPrerequisites.map((topic) => (
                    <div
                      key={topic}
                      className="flex items-center justify-between gap-2 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3 py-2"
                    >
                      <span className="text-sm text-zinc-800 dark:text-zinc-200">
                        {topic}
                      </span>
                      {createdTopics[topic] ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          Created
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleQuickCreateTopic(topic)}
                          disabled={creatingTopic === topic}
                          className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          {creatingTopic === topic ? "Creating..." : "+ Create Topic"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {estimatedMinutes && (
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                ⏱ Estimated study time: <strong>{estimatedMinutes} minutes</strong>
              </p>
            )}
          </div>
        )}

        {/* Prerequisites (hidden input + display) */}
        <input type="hidden" name="prerequisites" value={prerequisites} />
        <input type="hidden" name="relatedTopics" value={relatedTopics} />
        <input type="hidden" name="estimatedMinutes" value={estimatedMinutes} />
        <input type="hidden" name="overview" value={overview} />

        {prerequisites && (
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Prerequisites (auto-suggested)
            </label>
            <input
              type="text"
              value={prerequisites}
              onChange={(e) => setPrerequisites(e.target.value)}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Topic IDs that should be studied before this topic
            </p>
          </div>
        )}

        {relatedTopics && (
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Related Topics (auto-suggested)
            </label>
            <input
              type="text"
              value={relatedTopics}
              onChange={(e) => setRelatedTopics(e.target.value)}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Related topic IDs to study alongside
            </p>
          </div>
        )}

        {overview && (
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Generated Overview (will be saved as overview.md)
            </label>
            <textarea
              value={overview}
              onChange={(e) => setOverview(e.target.value)}
              rows={8}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              You can edit this before creating. It provides structure for your study.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Creating..." : "Create Topic"}
        </button>
      </form>
    </div>
  );
}
