"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { createTopic, createProblem } from "./actions";
import type { CreateTopicState, CreateProblemState } from "./actions";
import { parseFormWithAI, enhancePromptWithAI } from "./lib";
import type { TopicFormData, ProblemFormData, FormType } from "./lib";

type Tab = "topic" | "problem";

export default function CreateForm() {
  const [activeTab, setActiveTab] = useState<Tab>("topic");

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-6 md:p-10">
      <header className="mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            ← Dashboard
          </Link>
        </div>
        <h1 className="mt-4 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          Create New
        </h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Add a new topic or problem to your workspace
        </p>
      </header>

      {/* Tabs */}
      <div className="mb-6" role="tablist" aria-label="Create type">
        <div className="flex gap-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 p-1 w-fit">
          <button
            role="tab"
            aria-selected={activeTab === "topic"}
            onClick={() => setActiveTab("topic")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === "topic"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            Topic
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "problem"}
            onClick={() => setActiveTab("problem")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === "problem"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            Problem
          </button>
        </div>
      </div>

      {/* Form */}
      {activeTab === "topic" ? <TopicForm /> : <ProblemForm />}
    </div>
  );
}

/* ─── AI Assist Component ─── */

function AIAssist({
  formType,
  onResult,
}: {
  formType: FormType;
  onResult: (data: TopicFormData | ProblemFormData) => void;
}) {
  const [text, setText] = useState("");
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [showEnhanced, setShowEnhanced] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [filling, setFilling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEnhance() {
    if (!text.trim()) return;
    setEnhancing(true);
    setError(null);

    try {
      const enhanced = await enhancePromptWithAI(text, formType);
      setEnhancedPrompt(enhanced);
      setShowEnhanced(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to enhance prompt",
      );
    } finally {
      setEnhancing(false);
    }
  }

  async function handleFillForm() {
    const promptToUse = showEnhanced ? enhancedPrompt : text;
    if (!promptToUse.trim()) return;
    setFilling(true);
    setError(null);

    try {
      const data = await parseFormWithAI(promptToUse, formType);
      onResult(data);
      setText("");
      setEnhancedPrompt("");
      setShowEnhanced(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to connect to AI service",
      );
    } finally {
      setFilling(false);
    }
  }

  function handleSkipEnhance() {
    setShowEnhanced(false);
    setEnhancedPrompt("");
    handleFillForm();
  }

  function handleReset() {
    setShowEnhanced(false);
    setEnhancedPrompt("");
    setError(null);
  }

  const isLoading = enhancing || filling;

  return (
    <div className="mb-6 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30 p-4">
      <div className="flex items-center gap-2 mb-2">
        <svg
          className="w-4 h-4 text-indigo-600 dark:text-indigo-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"
          />
        </svg>
        <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
          Ask AI to fill the form
        </span>
      </div>
      <p className="text-xs text-indigo-600 dark:text-indigo-400 mb-3">
        Describe what you want to create. AI will refine your prompt first, then
        populate the fields.
      </p>

      {/* Input area */}
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleEnhance();
            }
          }}
          placeholder={
            formType === "topic"
              ? 'e.g., "A hard DSA topic about graph traversal with tags bfs and dfs"'
              : 'e.g., "Two Sum from LeetCode, easy, asked at Google and Amazon, uses hash map pattern"'
          }
          className="flex-1 rounded-md border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          disabled={isLoading}
        />
        <button
          type="button"
          onClick={handleEnhance}
          disabled={isLoading || !text.trim()}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {enhancing ? "Enhancing..." : "Generate Prompt"}
        </button>
        <button
          type="button"
          onClick={handleSkipEnhance}
          disabled={isLoading || !text.trim()}
          className="rounded-md border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {filling && !showEnhanced ? "Filling..." : "Fill Directly"}
        </button>
      </div>

      {/* Enhanced prompt preview */}
      {showEnhanced && enhancedPrompt && (
        <div className="mt-3 rounded-md border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 p-3">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
              Enhanced Prompt
            </span>
          </div>
          <textarea
            value={enhancedPrompt}
            onChange={(e) => setEnhancedPrompt(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-y"
          />
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={handleFillForm}
              disabled={filling || !enhancedPrompt.trim()}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {filling ? "Filling..." : "Use This & Fill Form"}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={filling}
              className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

function TopicForm() {
  const [state, formAction, isPending] = useActionState<
    CreateTopicState,
    FormData
  >(createTopic, {});
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [tags, setTags] = useState("");

  function handleAIResult(data: TopicFormData | ProblemFormData) {
    const d = data as TopicFormData;
    if (d.title) setTitle(d.title);
    if (d.category) setCategory(d.category);
    if (d.difficulty) setDifficulty(d.difficulty);
    if (d.tags) setTags(d.tags.join(", "));
  }

  return (
    <div className="max-w-lg">
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

function ProblemForm() {
  const [state, formAction, isPending] = useActionState<
    CreateProblemState,
    FormData
  >(createProblem, {});
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [companies, setCompanies] = useState("");
  const [patterns, setPatterns] = useState("");
  const [url, setUrl] = useState("");

  function handleAIResult(data: TopicFormData | ProblemFormData) {
    const d = data as ProblemFormData;
    if (d.title) setTitle(d.title);
    if (d.platform) setPlatform(d.platform);
    if (d.difficulty) setDifficulty(d.difficulty);
    if (d.companies) setCompanies(d.companies.join(", "));
    if (d.patterns) setPatterns(d.patterns.join(", "));
    if (d.url) setUrl(d.url);
  }

  return (
    <div className="max-w-lg">
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
            htmlFor="problem-platform"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
          >
            Platform <span className="text-red-500">*</span>
          </label>
          <select
            id="problem-platform"
            name="platform"
            required
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select a platform</option>
            <option value="leetcode">LeetCode</option>
            <option value="codeforces">Codeforces</option>
            <option value="gfg">GeeksForGeeks</option>
          </select>
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
