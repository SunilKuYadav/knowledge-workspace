"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type { Topic } from "@/src/types";
import {
  linkProblemToTopic,
  unlinkProblemFromTopic,
} from "@/app/actions/link-actions";

interface LinkTopicButtonProps {
  problemId: string;
  linkedTopicIds: string[];
  allTopics: Pick<Topic, "id" | "title" | "category">[];
}

export default function LinkTopicButton({
  problemId,
  linkedTopicIds: initialLinkedIds,
  allTopics,
}: LinkTopicButtonProps) {
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

  const linkedTopics = allTopics.filter((t) => linkedIds.includes(t.id));
  const availableTopics = allTopics.filter(
    (t) =>
      !linkedIds.includes(t.id) &&
      (search === "" ||
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase())),
  );

  async function handleLink(topicId: string) {
    setLoading(topicId);
    const result = await linkProblemToTopic(problemId, topicId);
    if (result.success) {
      setLinkedIds((prev) => [...prev, topicId]);
    }
    setLoading(null);
  }

  async function handleUnlink(topicId: string) {
    setLoading(topicId);
    const result = await unlinkProblemFromTopic(problemId, topicId);
    if (result.success) {
      setLinkedIds((prev) => prev.filter((id) => id !== topicId));
    }
    setLoading(null);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Linked topics display */}
      {linkedTopics.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {linkedTopics.map((topic) => (
            <span
              key={topic.id}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400"
            >
              <Link
                href={`/topics/${topic.id}`}
                className="hover:underline"
              >
                {topic.title}
              </Link>
              <button
                onClick={() => handleUnlink(topic.id)}
                disabled={loading === topic.id}
                className="ml-0.5 text-teal-600 dark:text-teal-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-50"
                aria-label={`Unlink ${topic.title}`}
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
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-colors"
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
        Link Topic
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-72 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg">
          <div className="p-3 border-b border-zinc-100 dark:border-zinc-800">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search topics..."
              className="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              autoFocus
            />
          </div>
          <ul className="max-h-56 overflow-y-auto p-1">
            {availableTopics.length === 0 ? (
              <li className="px-3 py-2 text-sm text-zinc-400">
                {search ? "No matching topics" : "All topics linked"}
              </li>
            ) : (
              availableTopics.map((topic) => (
                <li key={topic.id}>
                  <button
                    onClick={() => handleLink(topic.id)}
                    disabled={loading === topic.id}
                    className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                  >
                    <span className="text-zinc-900 dark:text-zinc-100">
                      {topic.title}
                    </span>
                    <span className="ml-2 text-xs text-zinc-400 capitalize">
                      {topic.category.replace("-", " ")}
                    </span>
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
