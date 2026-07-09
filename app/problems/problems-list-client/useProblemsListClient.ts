"use client";

import { useState, useMemo } from "react";
import type { Problem } from "@/src/types";
import type { DifficultyFilter, StatusFilter, PlatformFilter } from "./types";

export type SortField = "title" | "difficulty" | "updatedAt" | "platform";
export type SortDirection = "asc" | "desc";

const DIFFICULTY_ORDER: Record<string, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

export function useProblemsListClient(problems: Problem[]) {
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("");
  const [status, setStatus] = useState<StatusFilter>("");
  const [platform, setPlatform] = useState<PlatformFilter>("");
  const [sortField, setSortField] = useState<SortField>("updatedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const filtered = useMemo(() => {
    let result = problems.filter((problem) => {
      const matchesSearch =
        search === "" ||
        problem.title.toLowerCase().includes(search.toLowerCase()) ||
        problem.patterns.some((p) =>
          p.toLowerCase().includes(search.toLowerCase()),
        ) ||
        problem.companies.some((c) =>
          c.toLowerCase().includes(search.toLowerCase()),
        );
      const matchesDifficulty =
        difficulty === "" || problem.difficulty === difficulty;
      const matchesStatus = status === "" || problem.status === status;
      const matchesPlatform = platform === "" || problem.platform === platform;
      return (
        matchesSearch && matchesDifficulty && matchesStatus && matchesPlatform
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
        case "platform":
          cmp = a.platform.localeCompare(b.platform);
          break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });

    return result;
  }, [problems, search, difficulty, status, platform, sortField, sortDirection]);

  function toggleSort(field: SortField) {
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
    platform,
    setPlatform,
    sortField,
    sortDirection,
    toggleSort,
    filtered,
  };
}
