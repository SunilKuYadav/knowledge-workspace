/**
 * GET /api/duplicates
 *
 * Scans all topics and problems in the workspace to detect potential duplicates.
 * Uses multiple heuristics:
 * - Exact title match (case-insensitive)
 * - Slug collision (same generated slug)
 * - High title similarity (Levenshtein-based)
 * - Overlapping tags/patterns + same category/platform
 */

import { NextResponse } from "next/server";
import { getWorkspacePath } from "@/src/lib/constants";
import { FileTopicRepository } from "@/src/filesystem/FileTopicRepository";
import { FileProblemRepository } from "@/src/filesystem/FileProblemRepository";
import { TopicService } from "@/src/services/TopicService";
import { ProblemService } from "@/src/services/ProblemService";
import type { Topic } from "@/types";
import type { Problem } from "@/types";

// ---- Similarity helpers ----

/**
 * Normalized Levenshtein similarity (0..1, where 1 = identical).
 */
function similarity(a: string, b: string): number {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  if (s1 === s2) return 1;

  const len1 = s1.length;
  const len2 = s2.length;
  if (len1 === 0 || len2 === 0) return 0;

  const matrix: number[][] = Array.from({ length: len1 + 1 }, (_, i) =>
    Array.from({ length: len2 + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  const maxLen = Math.max(len1, len2);
  return 1 - matrix[len1][len2] / maxLen;
}

/**
 * Jaccard similarity for two string arrays.
 */
function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const setA = new Set(a.map((s) => s.toLowerCase()));
  const setB = new Set(b.map((s) => s.toLowerCase()));
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ---- Types ----

export interface DuplicateGroup<T> {
  items: T[];
  reason: string;
  confidence: "high" | "medium" | "low";
  titleSimilarity: number;
  tagOverlap: number;
}

export interface DuplicatesResponse {
  topicDuplicates: DuplicateGroup<Topic>[];
  problemDuplicates: DuplicateGroup<Problem>[];
}

// ---- Detection Logic ----

function detectTopicDuplicates(topics: Topic[]): DuplicateGroup<Topic>[] {
  const groups: DuplicateGroup<Topic>[] = [];
  const processed = new Set<string>();

  for (let i = 0; i < topics.length; i++) {
    if (processed.has(topics[i].id)) continue;

    const group: Topic[] = [topics[i]];

    for (let j = i + 1; j < topics.length; j++) {
      if (processed.has(topics[j].id)) continue;

      const titleSim = similarity(topics[i].title, topics[j].title);
      const slugA = topics[i].slug || generateSlug(topics[i].title);
      const slugB = topics[j].slug || generateSlug(topics[j].title);
      const slugMatch = slugA === slugB;
      const sameCategory = topics[i].category === topics[j].category;
      const tagOverlap = jaccardSimilarity(topics[i].tags, topics[j].tags);

      // High confidence: exact title or slug match
      if (titleSim >= 0.95 || slugMatch) {
        group.push(topics[j]);
      }
      // Medium confidence: very similar title in same category
      else if (titleSim >= 0.75 && sameCategory) {
        group.push(topics[j]);
      }
      // Low confidence: moderate title similarity + high tag overlap + same category
      else if (titleSim >= 0.6 && tagOverlap >= 0.5 && sameCategory) {
        group.push(topics[j]);
      }
    }

    if (group.length > 1) {
      for (const item of group) processed.add(item.id);

      // Determine best reason and confidence
      let bestTitleSim = 0;
      let bestTagOverlap = 0;
      for (let k = 1; k < group.length; k++) {
        const ts = similarity(group[0].title, group[k].title);
        const to = jaccardSimilarity(group[0].tags, group[k].tags);
        if (ts > bestTitleSim) bestTitleSim = ts;
        if (to > bestTagOverlap) bestTagOverlap = to;
      }

      let reason: string;
      let confidence: "high" | "medium" | "low";
      if (bestTitleSim >= 0.95) {
        reason = "Near-identical titles";
        confidence = "high";
      } else if (bestTitleSim >= 0.75) {
        reason = "Very similar titles in the same category";
        confidence = "medium";
      } else {
        reason = "Similar titles with overlapping tags";
        confidence = "low";
      }

      groups.push({
        items: group,
        reason,
        confidence,
        titleSimilarity: Math.round(bestTitleSim * 100),
        tagOverlap: Math.round(bestTagOverlap * 100),
      });
    }
  }

  return groups.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.confidence] - order[b.confidence];
  });
}

function detectProblemDuplicates(problems: Problem[]): DuplicateGroup<Problem>[] {
  const groups: DuplicateGroup<Problem>[] = [];
  const processed = new Set<string>();

  for (let i = 0; i < problems.length; i++) {
    if (processed.has(problems[i].id)) continue;

    const group: Problem[] = [problems[i]];

    for (let j = i + 1; j < problems.length; j++) {
      if (processed.has(problems[j].id)) continue;

      const titleSim = similarity(problems[i].title, problems[j].title);
      const slugA = generateSlug(problems[i].title);
      const slugB = generateSlug(problems[j].title);
      const slugMatch = slugA === slugB;
      const samePlatform = problems[i].platform === problems[j].platform;
      const patternOverlap = jaccardSimilarity(
        problems[i].patterns,
        problems[j].patterns,
      );

      // High confidence: exact title or slug match
      if (titleSim >= 0.95 || slugMatch) {
        group.push(problems[j]);
      }
      // Medium: very similar title (possibly cross-platform duplicate)
      else if (titleSim >= 0.8) {
        group.push(problems[j]);
      }
      // Low: same platform, moderate title similarity, high pattern overlap
      else if (titleSim >= 0.6 && patternOverlap >= 0.6 && samePlatform) {
        group.push(problems[j]);
      }
    }

    if (group.length > 1) {
      for (const item of group) processed.add(item.id);

      let bestTitleSim = 0;
      let bestPatternOverlap = 0;
      for (let k = 1; k < group.length; k++) {
        const ts = similarity(group[0].title, group[k].title);
        const po = jaccardSimilarity(group[0].patterns, group[k].patterns);
        if (ts > bestTitleSim) bestTitleSim = ts;
        if (po > bestPatternOverlap) bestPatternOverlap = po;
      }

      let reason: string;
      let confidence: "high" | "medium" | "low";
      if (bestTitleSim >= 0.95) {
        reason = "Near-identical titles";
        confidence = "high";
      } else if (bestTitleSim >= 0.8) {
        reason = "Very similar titles (possible cross-platform duplicate)";
        confidence = "medium";
      } else {
        reason = "Similar titles with overlapping patterns";
        confidence = "low";
      }

      groups.push({
        items: group,
        reason,
        confidence,
        titleSimilarity: Math.round(bestTitleSim * 100),
        tagOverlap: Math.round(bestPatternOverlap * 100),
      });
    }
  }

  return groups.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.confidence] - order[b.confidence];
  });
}

// ---- Route Handler ----

export async function GET() {
  try {
    const workspacePath = getWorkspacePath();
    const topicService = new TopicService(new FileTopicRepository(workspacePath));
    const problemService = new ProblemService(new FileProblemRepository(workspacePath));

    const [topics, problems] = await Promise.all([
      topicService.getAllTopics(),
      problemService.getAllProblems(),
    ]);

    const topicDuplicates = detectTopicDuplicates(topics);
    const problemDuplicates = detectProblemDuplicates(problems);

    return NextResponse.json({
      topicDuplicates,
      problemDuplicates,
    } satisfies DuplicatesResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
