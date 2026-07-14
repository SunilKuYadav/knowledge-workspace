"use client";

import { useState, useMemo } from "react";
import type { Topic } from "@/src/types";
import type { DifficultyFilter, StatusFilter, CategoryFilter } from "./types";

export type TopicSortField =
  | "title"
  | "difficulty"
  | "updatedAt"
  | "confidence"
  | "category";
export type SortDirection = "asc" | "desc";

const DIFFICULTY_ORDER: Record<string, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

export function useTopicsListClient(topics: Topic[]) {
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("");
  const [status, setStatus] = useState<StatusFilter>("");
  const [category, setCategory] = useState<CategoryFilter>("");
  const [sortField, setSortField] = useState<TopicSortField>("updatedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const filtered = useMemo(() => {
    let result = topics.filter((topic) => {
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

    // Sort
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
        case "difficulty":
          cmp =
            (DIFFICULTY_ORDER[a.difficulty] ?? 0) -
            (DIFFICULTY_ORDER[b.difficulty] ?? 0);
          break;
        case "updatedAt":
          cmp =
            new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case "confidence":
          cmp = a.confidence - b.confidence;
          break;
        case "category":
          cmp = a.category.localeCompare(b.category);
          break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });

    return result;
  }, [topics, search, difficulty, status, category, sortField, sortDirection]);

  function toggleSort(field: TopicSortField) {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  }

  return {
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
  };
}
