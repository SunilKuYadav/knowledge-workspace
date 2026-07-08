"use client";

import { useState, useMemo } from "react";
import type { Problem } from "@/src/types";
import type { DifficultyFilter, StatusFilter, PlatformFilter } from "./types";

export function useProblemsListClient(problems: Problem[]) {
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("");
  const [status, setStatus] = useState<StatusFilter>("");
  const [platform, setPlatform] = useState<PlatformFilter>("");

  const filtered = useMemo(() => {
    return problems.filter((problem) => {
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
  }, [problems, search, difficulty, status, platform]);

  return {
    search,
    setSearch,
    difficulty,
    setDifficulty,
    status,
    setStatus,
    platform,
    setPlatform,
    filtered,
  };
}
