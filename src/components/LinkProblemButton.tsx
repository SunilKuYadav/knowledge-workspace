"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type { Problem } from "@/src/types";
import {
  linkProblemToTopic,
  unlinkProblemFromTopic,
} from "@/app/actions/link-actions";

interface LinkProblemButtonProps {
  topicId: string;
  linkedProblemIds: string[];
  allProblems: Pick<Problem, "id" | "title" | "platform" | "difficulty">[];
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  medium:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  hard: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function LinkProblemButton({
  topicId,
  linkedProblemIds: initialLinkedIds,
  allProblems,
}: LinkProblemButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [linkedIds, setLinkedIds] = useState<string[]>(initialLinkedIds);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const linkedProblems = allProblems.filter((p) => linkedIds.includes(p.id));
  const availableProblems = allProblems.filter(
    (p) =>
      !linkedIds.includes(p.id) &&
      (search === "" ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.platform.toLowerCase().includes(search.toLowerCase())),
  );

  async function handleLink(problemId: string) {
    setLoading(problemId);
    const result = await linkProblemToTopic(problemId, topicId);
    if (result.success) {
      setLinkedIds((prev) => [...prev, problemId]);
    }
    setLoading(null);
  }

  async function handleUnlink(problemId: string) {
    setLoading(problemId);
    const result = await unlinkProblemFromTopic(problemId, topicId);
    if (result.success) {
      setLinkedIds((prev) => prev.filter((id) => id !== problemId));
    }
    setLoading(null);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Linked problems display */}
      {linkedProblems.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {linkedProblems.map((problem) => (
            <span
              key={problem.id}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400"
            >
              <Link
                href={`/problems/${problem.id}`}
                className="hover:underline"
              >
                {problem.title}
              </Link>
              <span
                className={`ml-1 text-[10px] px-1 py-0.5 rounded ${DIFFICULTY_COLORS[problem.difficulty]}`}
              >
                {problem.difficulty}
              </span>
              <button
                onClick={() => handleUnlink(problem.id)}
                disabled={loading === problem.id}
                className="ml-0.5 text-indigo-600 dark:text-indigo-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-50"
                aria-label={`Unlink ${problem.title}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Link button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
        Link Problem
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-80 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg">
          <div className="p-3 border-b border-zinc-100 dark:border-zinc-800">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search problems..."
              className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              autoFocus
            />
          </div>
          <ul className="max-h-56 overflow-y-auto p-1">
            {availableProblems.length === 0 ? (
              <li className="px-3 py-2 text-sm text-zinc-400">
                {search ? "No matching problems" : "All problems linked"}
              </li>
            ) : (
              availableProblems.map((problem) => (
                <li key={problem.id}>
                  <button
                    onClick={() => handleLink(problem.id)}
                    disabled={loading === problem.id}
                    className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors flex items-center justify-between"
                  >
                    <span className="text-zinc-900 dark:text-zinc-100 truncate">
                      {problem.title}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <span className="text-[10px] text-zinc-400 capitalize">
                        {problem.platform}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded ${DIFFICULTY_COLORS[problem.difficulty]}`}
                      >
                        {problem.difficulty}
                      </span>
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
