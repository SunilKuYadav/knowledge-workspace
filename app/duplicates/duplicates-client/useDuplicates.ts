import { useState, useCallback, useRef, useEffect } from "react";
import type { Topic } from "@/types";
import type { Problem } from "@/types";
import type { DuplicateGroup, DuplicatesResponse, TabType } from "./types";

export function useDuplicates() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topicDuplicates, setTopicDuplicates] = useState<DuplicateGroup<Topic>[]>([]);
  const [problemDuplicates, setProblemDuplicates] = useState<DuplicateGroup<Problem>[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("topics");
  const [merging, setMerging] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [mergeResults, setMergeResults] = useState<Record<string, Record<string, unknown>>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const didFetch = useRef(false);

  const fetchDuplicates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/duplicates");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch duplicates");
      }
      const data: DuplicatesResponse = await res.json();
      setTopicDuplicates(data.topicDuplicates);
      setProblemDuplicates(data.problemDuplicates);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!didFetch.current) {
      didFetch.current = true;
      fetchDuplicates();
    }
  });

  const requestAIMerge = useCallback(
    async (groupKey: string, type: "topic" | "problem", items: Record<string, unknown>[]) => {
      setAiLoading(groupKey);
      try {
        const res = await fetch("/api/ai/merge-suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, items }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "AI merge suggestion failed");
        }
        const data = await res.json();
        setMergeResults((prev) => ({ ...prev, [groupKey]: data.merged }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "AI merge failed");
      } finally {
        setAiLoading(null);
      }
    },
    [],
  );

  const executeMerge = useCallback(
    async (
      groupKey: string,
      type: "topic" | "problem",
      primaryId: string,
      duplicateIds: string[],
      mergedData: Record<string, unknown>,
    ) => {
      setMerging(groupKey);
      try {
        const res = await fetch("/api/duplicates/merge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, primaryId, duplicateIds, mergedData }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Merge failed");
        }
        const data = await res.json();
        setSuccessMessage(data.message);

        // Remove merged group from state
        if (type === "topic") {
          setTopicDuplicates((prev) =>
            prev.filter((g) => g.items[0].id !== primaryId),
          );
        } else {
          setProblemDuplicates((prev) =>
            prev.filter((g) => g.items[0].id !== primaryId),
          );
        }

        // Clear merge result for this group
        setMergeResults((prev) => {
          const next = { ...prev };
          delete next[groupKey];
          return next;
        });

        setTimeout(() => setSuccessMessage(null), 4000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Merge execution failed");
      } finally {
        setMerging(null);
      }
    },
    [],
  );

  /**
   * Attempts a local (deterministic) merge for topics.
   */
  const localMergeTopic = useCallback((items: Topic[]): Partial<Topic> => {
    const primary = items[0];
    const allTags = [...new Set(items.flatMap((t) => t.tags))];
    const allPrereqs = [...new Set(items.flatMap((t) => t.prerequisites || []))];
    const allRelated = [...new Set(items.flatMap((t) => t.relatedTopics || []))];
    const allProblemIds = [...new Set(items.flatMap((t) => t.relatedProblemIds || []))];

    const statusOrder = { "not-started": 0, "in-progress": 1, completed: 2 };
    const bestStatus = items.reduce(
      (best, t) => (statusOrder[t.status] > statusOrder[best] ? t.status : best),
      primary.status,
    );

    const bestConfidence = Math.max(...items.map((t) => t.confidence)) as 1 | 2 | 3 | 4 | 5;
    const maxMinutes = Math.max(...items.map((t) => t.estimatedMinutes || 0));
    const earliestCreated = items
      .map((t) => t.createdAt)
      .sort()[0];
    const latestUpdated = items
      .map((t) => t.updatedAt)
      .sort()
      .reverse()[0];

    return {
      id: primary.id,
      title: primary.title,
      slug: primary.slug,
      category: primary.category,
      difficulty: primary.difficulty,
      status: bestStatus,
      confidence: bestConfidence,
      tags: allTags,
      prerequisites: allPrereqs,
      relatedTopics: allRelated,
      relatedProblemIds: allProblemIds,
      estimatedMinutes: maxMinutes || undefined,
      createdAt: earliestCreated,
      updatedAt: latestUpdated,
    };
  }, []);

  /**
   * Attempts a local (deterministic) merge for problems.
   */
  const localMergeProblem = useCallback((items: Problem[]): Partial<Problem> => {
    const primary = items[0];
    const allCompanies = [...new Set(items.flatMap((p) => p.companies))];
    const allPatterns = [...new Set(items.flatMap((p) => p.patterns))];
    const allTopicIds = [...new Set(items.flatMap((p) => p.relatedTopicIds || []))];

    const statusOrder = { "not-started": 0, attempted: 1, solved: 2 };
    const bestStatus = items.reduce(
      (best, p) => (statusOrder[p.status] > statusOrder[best] ? p.status : best),
      primary.status,
    );

    const isFavorite = items.some((p) => p.favorite);
    const url = items.find((p) => p.url)?.url;
    const maxAttempts = Math.max(...items.map((p) => p.attempts || 0));
    const maxRevisionCount = Math.max(...items.map((p) => p.revisionCount || 0));
    const latestSolved = items
      .map((p) => p.lastSolved)
      .filter(Boolean)
      .sort()
      .reverse()[0] || null;
    const earliestCreated = items.map((p) => p.createdAt).sort()[0];
    const latestUpdated = items.map((p) => p.updatedAt).sort().reverse()[0];

    // Best frequency (highest)
    const freqOrder = { "very-high": 4, high: 3, medium: 2, low: 1 };
    const bestFreq = items.reduce(
      (best, p) => {
        if (!p.frequency) return best;
        if (!best) return p.frequency;
        return freqOrder[p.frequency] > freqOrder[best] ? p.frequency : best;
      },
      primary.frequency,
    );

    return {
      id: primary.id,
      title: primary.title,
      platform: primary.platform,
      difficulty: primary.difficulty,
      companies: allCompanies,
      patterns: allPatterns,
      status: bestStatus,
      favorite: isFavorite,
      url,
      frequency: bestFreq,
      attempts: maxAttempts || undefined,
      lastSolved: latestSolved,
      revisionCount: maxRevisionCount || undefined,
      timeComplexity: primary.timeComplexity,
      spaceComplexity: primary.spaceComplexity,
      relatedTopicIds: allTopicIds,
      createdAt: earliestCreated,
      updatedAt: latestUpdated,
    };
  }, []);

  return {
    loading,
    error,
    topicDuplicates,
    problemDuplicates,
    activeTab,
    setActiveTab,
    merging,
    aiLoading,
    mergeResults,
    successMessage,
    fetchDuplicates,
    requestAIMerge,
    executeMerge,
    localMergeTopic,
    localMergeProblem,
    setError,
  };
}
