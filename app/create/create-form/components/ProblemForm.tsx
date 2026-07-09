"use client";

import { useActionState, useState, useCallback } from "react";
import { createProblem, quickCreateTopic } from "../../actions";
import type { CreateProblemState } from "../../actions";
import type { TopicFormData, ProblemFormData, ProblemCreationAssistResult } from "../../lib";
import { getProblemCreationAssist } from "../../lib";
import { AIAssist } from "./AIAssist";

export function ProblemForm() {
  const [state, formAction, isPending] = useActionState<
    CreateProblemState,
    FormData
  >(createProblem, {});
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [companies, setCompanies] = useState("");
  const [patterns, setPatterns] = useState("");
  const [url, setUrl] = useState("");
  const [relatedTopicIds, setRelatedTopicIds] = useState("");

  // AI assist state
  const [assistLoading, setAssistLoading] = useState(false);
  const [assistResult, setAssistResult] = useState<ProblemCreationAssistResult | null>(null);
  const [assistError, setAssistError] = useState<string | null>(null);

  // Quick-create state
  const [createdTopics, setCreatedTopics] = useState<Record<string, string>>({});
  const [creatingTopic, setCreatingTopic] = useState<string | null>(null);

  function handleAIResult(data: TopicFormData | ProblemFormData) {
    const d = data as ProblemFormData;
    if (d.title) setTitle(d.title);
    if (d.difficulty) setDifficulty(d.difficulty);
    if (d.companies) setCompanies(d.companies.join(", "));
    if (d.patterns) setPatterns(d.patterns.join(", "));
    if (d.url) setUrl(d.url);
  }

  const handleGetSuggestions = useCallback(async () => {
    if (!title.trim() || !difficulty) {
      setAssistError("Please fill in title and difficulty first.");
      return;
    }

    setAssistLoading(true);
    setAssistError(null);
    setAssistResult(null);

    try {
      const result = await getProblemCreationAssist({
        title: title.trim(),
        difficulty,
        patterns: patterns
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean),
        companies: companies
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
      });
      setAssistResult(result);

      // Auto-fill relatedTopicIds
      if (result.relatedTopicIds.length > 0) {
        setRelatedTopicIds(result.relatedTopicIds.join(", "));
      }

      // Auto-fill patterns if AI suggested some and user hasn't specified
      if (result.suggestedPatterns.length > 0 && !patterns.trim()) {
        setPatterns(result.suggestedPatterns.join(", "));
      }
    } catch (err) {
      setAssistError(
        err instanceof Error ? err.message : "Failed to get suggestions",
      );
    } finally {
      setAssistLoading(false);
    }
  }, [title, difficulty, patterns, companies]);

  const handleQuickCreateTopic = useCallback(async (topicTitle: string) => {
    setCreatingTopic(topicTitle);
    try {
      const result = await quickCreateTopic(topicTitle, "dsa", "medium");
      if (result.topic) {
        setCreatedTopics((prev) => ({ ...prev, [topicTitle]: result.topic!.id }));
        // Add the new topic ID to relatedTopicIds
        setRelatedTopicIds((prev) => {
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
  }, []);

  return (
    <div className="max-w-2xl">
      <AIAssist formType="problem" onResult={handleAIResult} />

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
            htmlFor="problem-title"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
          >
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="problem-title"
            name="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Valid Parentheses"
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="problem-difficulty"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
          >
            Difficulty <span className="text-red-500">*</span>
          </label>
          <select
            id="problem-difficulty"
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
            htmlFor="problem-companies"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
          >
            Companies
          </label>
          <input
            id="problem-companies"
            name="companies"
            type="text"
            value={companies}
            onChange={(e) => setCompanies(e.target.value)}
            placeholder="e.g., Amazon, Meta, Google (comma-separated)"
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Separate multiple companies with commas
          </p>
        </div>

        <div>
          <label
            htmlFor="problem-patterns"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
          >
            Patterns
          </label>
          <input
            id="problem-patterns"
            name="patterns"
            type="text"
            value={patterns}
            onChange={(e) => setPatterns(e.target.value)}
            placeholder="e.g., stack, two-pointers, dp (comma-separated)"
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Separate multiple patterns with commas
          </p>
        </div>

        <div>
          <label
            htmlFor="problem-url"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
          >
            Problem URL
          </label>
          <input
            id="problem-url"
            name="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://leetcode.com/problems/..."
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
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
              disabled={assistLoading || !title.trim() || !difficulty}
              className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {assistLoading ? "Analyzing..." : "Check Readiness & Link Topics"}
            </button>
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Get readiness assessment, related topics, and pattern suggestions based on your knowledge base.
          </p>
          {assistError && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">{assistError}</p>
          )}
        </div>

        {/* AI Readiness Assessment */}
        {assistResult && (
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 p-4 space-y-3">
            <h4 className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              ✓ Readiness Assessment
            </h4>

            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              {assistResult.readinessAssessment}
            </p>

            {assistResult.suggestedTopics.length > 0 && (
              <div>
                <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">
                  📚 Study these topics first:
                </p>
                <div className="space-y-1.5">
                  {assistResult.suggestedTopics.map((topic) => (
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

            {assistResult.similarProblemIds.length > 0 && (
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                🔗 Similar problems in your workspace: {assistResult.similarProblemIds.join(", ")}
              </p>
            )}

            {assistResult.suggestedPatterns.length > 0 && !patterns.trim() && (
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                🎯 Suggested patterns: {assistResult.suggestedPatterns.join(", ")}
              </p>
            )}
          </div>
        )}

        {/* Hidden field for relatedTopicIds */}
        <input type="hidden" name="relatedTopicIds" value={relatedTopicIds} />

        {relatedTopicIds && (
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Linked Topics (auto-suggested)
            </label>
            <input
              type="text"
              value={relatedTopicIds}
              onChange={(e) => setRelatedTopicIds(e.target.value)}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Topics to study before attempting this problem
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Creating..." : "Create Problem"}
        </button>
      </form>
    </div>
  );
}
