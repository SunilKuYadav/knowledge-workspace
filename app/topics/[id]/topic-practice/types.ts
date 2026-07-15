/**
 * Types for the Topic Practice feature.
 *
 * This module lets users practice coding problems derived from a topic.
 * AI suggests problems based on topic content, users can generate full
 * problem descriptions, then code + evaluate solutions inline.
 *
 * Generated problems are created as standalone problems in the workspace
 * and linked to the topic bidirectionally. They appear in both the topic's
 * Practice tab and the main /problems list.
 */

export interface SuggestedProblem {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  description: string;
  patterns: string[];
  companies: string[];
  /** Why this problem is relevant to the topic */
  rationale: string;
  /** Whether a full problem has been generated from this suggestion */
  generated: boolean;
}

/**
 * A linked practice problem — a standalone problem that has been linked
 * to this topic, enriched with its description data for inline practice.
 */
export interface LinkedPracticeProblem {
  /** Problem ID (slug) */
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  patterns: string[];
  status: "not-started" | "attempted" | "solved";
  /** From description.json */
  description: string;
  constraints: string[];
  examples: { input: string; expectedOutput: string; explanation?: string }[];
  testCases: { input: string; expectedOutput: string }[];
  boilerplate: string;
  /** Hidden harness code prepended at execution time */
  harness?: string;
  timeComplexity?: string;
  spaceComplexity?: string;
}

export interface PracticeEvaluation {
  overallScore: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  complexity: { time: string; space: string };
  edgeCases?: string[];
  alternativeApproaches?: string[];
}
