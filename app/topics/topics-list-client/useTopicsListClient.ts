"use client";

import { useState, useMemo } from "react";
import type { Topic } from "@/src/types";
import type { DifficultyFilter, StatusFilter, CategoryFilter } from "./types";

export function useTopicsListClient(topics: Topic[]) {
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

  return {
    search,
    setSearch,
    difficulty,
    setDifficulty,
    status,
    setStatus,
    category,
    setCategory,
    filtered,
  };
}
