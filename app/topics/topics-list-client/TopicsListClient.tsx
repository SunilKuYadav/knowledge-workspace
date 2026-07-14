"use client";

import Link from "next/link";
import type { TopicsListClientProps, DifficultyFilter, StatusFilter, CategoryFilter } from "./types";
import { DIFFICULTY_COLORS, STATUS_COLORS } from "./constants";
import { useTopicsListClient } from "./useTopicsListClient";
import type { TopicSortField } from "./useTopicsListClient";

export default function TopicsListClient({ topics }: TopicsListClientProps) {
  const {
    search,
    setSearch,
    difficulty,
    setDifficulty,
    status,
    setStatus,
    category,
    setCategory,
    sortField,
    sortDirection,
    toggleSort,
    filtered,
  } = useTopicsListClient(topics);

  function SortButton({
    field,
    label,
  }: {
    field: TopicSortField;
    label: string;
  }) {
    const isActive = sortField === field;
    return (
      <button
        onClick={() => toggleSort(field)}
        className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
          isActive
            ? "border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400"
            : "border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800"
        }`}
      >
        {label}
        {isActive && (
          <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
        )}
      </button>
    );
  }

  return (
    <div>
      {/* Search and Filters */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title or tag..."
          className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          aria-label="Search topics"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as CategoryFilter)}
          className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          aria-label="Filter by category"
        >
          <option value="">All Categories</option>
          <option value="dsa">DSA</option>
          <option value="system-design">System Design</option>
          <option value="database">Database</option>
          <option value="networking">Networking</option>
          <option value="os">OS</option>
          <option value="oop">OOP</option>
        </select>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as DifficultyFilter)}
          className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          aria-label="Filter by difficulty"
        >
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
          className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          aria-label="Filter by status"
        >
          <option value="">All Statuses</option>
          <option value="not-started">Not Started</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Sort Controls */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Sort by:
        </span>
        <SortButton field="title" label="Title" />
        <SortButton field="difficulty" label="Difficulty" />
        <SortButton field="confidence" label="Confidence" />
        <SortButton field="updatedAt" label="Updated" />
        <SortButton field="category" label="Category" />
      </div>

      {/* Results Count */}
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
        Showing {filtered.length} of {topics.length} topics
      </p>

      {/* Topic List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-zinc-500 dark:text-zinc-400">
            No topics match your filters.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((topic) => (
            <li key={topic.id}>
              <Link
                href={`/topics/${topic.id}`}
                className="block rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {topic.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 capitalize">
                        {topic.category.replace("-", " ")}
                      </span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded ${DIFFICULTY_COLORS[topic.difficulty]}`}
                      >
                        {topic.difficulty}
                      </span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_COLORS[topic.status]}`}
                      >
                        {topic.status.replace("-", " ")}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        Confidence: {topic.confidence}/5
                      </span>
                    </div>
                    {topic.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {topic.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 shrink-0">
                    {new Date(topic.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
