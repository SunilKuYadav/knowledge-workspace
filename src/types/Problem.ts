import { z } from "zod";

/**
 * How frequently a problem appears in real interviews.
 */
export const ProblemFrequencySchema = z.enum([
  "very-high",
  "high",
  "medium",
  "low",
]);

export type ProblemFrequency = z.infer<typeof ProblemFrequencySchema>;

/**
 * Big-O complexity bucket for solution time/space tracking.
 */
export const ComplexitySchema = z.enum([
  "O(1)",
  "O(log n)",
  "O(n)",
  "O(n log n)",
  "O(n²)",
  "O(2ⁿ)",
  "O(n!)",
]);

export type Complexity = z.infer<typeof ComplexitySchema>;

/**
 * Zod schema for a Problem — a coding problem folder containing
 * metadata, notes, solution files, and revision data.
 */
export const ProblemSchema = z.object({
  id: z.string(),
  title: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  companies: z.array(z.string()),
  patterns: z.array(z.string()),
  status: z.enum(["not-started", "attempted", "solved"]),
  favorite: z.boolean(),
  url: z.string().optional(),
  /**
   * How often this problem appears in real FAANG/MAANG interviews.
   */
  frequency: ProblemFrequencySchema.optional(),
  /**
   * Total number of times the user has attempted this problem.
   */
  attempts: z.number().int().min(0).optional(),
  /**
   * ISO date string of the most recent solve.
   */
  lastSolved: z.string().nullable().optional(),
  /**
   * How many times this problem has been added to the revision queue.
   */
  revisionCount: z.number().int().min(0).optional(),
  /**
   * Time complexity of the user's best solution.
   */
  timeComplexity: ComplexitySchema.optional(),
  /**
   * Space complexity of the user's best solution.
   */
  spaceComplexity: ComplexitySchema.optional(),
  /**
   * Topic IDs that are related to this problem.
   * Powers "study these topics before attempting" and
   * "you've mastered these topics, try these problems" flows.
   */
  relatedTopicIds: z.array(z.string()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** A coding problem with difficulty, companies, patterns, and solve tracking. */
export type Problem = z.infer<typeof ProblemSchema>;
