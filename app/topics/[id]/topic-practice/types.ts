/**
 * Types for the Topic Practice feature.
 *
 * This module lets users practice coding problems derived from a topic.
 * AI suggests problems based on topic content, users can generate full
 * problem descriptions, then code + evaluate solutions inline.
 *
 * Generated problems are persisted to `practice-problems.json` in the topic folder.
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

export interface GeneratedPracticeProblem {
  /** Unique ID for persisting */
  id: string;
  /** Matches the suggestion ID it was created from */
  suggestionId: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  description: string;
  constraints: string[];
  examples: { input: string; expectedOutput: string; explanation?: string }[];
  testCases: { input: string; expectedOutput: string }[];
  boilerplate: string;
  timeComplexity?: string;
  spaceComplexity?: string;
  patterns: string[];
  /** User's saved solution code */
  savedSolution?: string;
  /** Last evaluation score (0-100) */
  lastScore?: number;
  /** ISO date of creation */
  createdAt: string;
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
