"use client";

import { useActionState, useState } from "react";
import { createProblem } from "../../actions";
import type { CreateProblemState } from "../../actions";
import type { TopicFormData, ProblemFormData } from "../../lib";
import { AIAssist } from "./AIAssist";

export function ProblemForm() {
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
