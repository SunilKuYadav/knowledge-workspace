"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Topic } from "@/src/types";

type DifficultyFilter = "" | "easy" | "medium" | "hard";
type StatusFilter = "" | "not-started" | "in-progress" | "completed";
type CategoryFilter =
  "" | "dsa" | "system-design" | "database" | "networking" | "os" | "oop";

export default function TopicsListClient({ topics }: { topics: Topic[] }) {
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("");
  const [status, setStatus] = useState<StatusFilter>("");
  const [category, setCategory] = useState<CategoryFilter>("");

  const filtered = useMemo(() => {
    return topics.filter((topic) => {
      const matchesSearch =
        search === "" ||
        topic.title.toLowerCase().includes(search.toLowerCase()) ||
        topic.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
      const matchesDifficulty =
        difficulty === "" || topic.difficulty === difficulty;
      const matchesStatus = status === "" || topic.status === status;
      const matchesCategory = category === "" || topic.category === category;
      return (
        matchesSearch && matchesDifficulty && matchesStatus && matchesCategory
      );
    });
  }, [topics, search, difficulty, status, category]);

  const difficultyColor: Record<string, string> = {
    easy: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    medium:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    hard: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  const statusColor: Record<string, string> = {
    "not-started":
      "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    "in-progress":
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    completed:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  };

  return (
    <div>
      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
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
                        className={`text-xs font-medium px-2 py-0.5 rounded ${difficultyColor[topic.difficulty]}`}
                      >
                        {topic.difficulty}
                      </span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded ${statusColor[topic.status]}`}
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
