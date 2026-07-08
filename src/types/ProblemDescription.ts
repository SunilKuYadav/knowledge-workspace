import { z } from "zod";

/**
 * A single test case with input, expected output, and optional explanation.
 */
export const TestCaseSchema = z.object({
  input: z.string(),
  expectedOutput: z.string(),
  explanation: z.string().optional(),
});

export type TestCase = z.infer<typeof TestCaseSchema>;

/**
 * A sample I/O entry with input, output, and explanation (interview-compatible).
 */
export const SampleIOSchema = z.object({
  input: z.string(),
  output: z.string(),
  explanation: z.string(),
});

export type SampleIO = z.infer<typeof SampleIOSchema>;

/**
 * An edge case with a description of what it tests.
 */
export const EdgeCaseSchema = z.object({
  description: z.string(),
  input: z.string(),
  expectedOutput: z.string(),
});

export type EdgeCase = z.infer<typeof EdgeCaseSchema>;

/**
 * A problem variation — a twist on the original problem saved for later practice.
 * Includes full interview-compatible metadata.
 */
export const ProblemVariationSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  constraints: z.array(z.string()).optional(),
  inputFormat: z.string().optional(),
  outputFormat: z.string().optional(),
  samples: z.array(SampleIOSchema).optional(),
  edgeCases: z.array(EdgeCaseSchema).optional(),
  testCases: z.array(TestCaseSchema),
  timeComplexity: z.string().optional(),
  spaceComplexity: z.string().optional(),
  boilerplate: z.string().optional(),
  hint: z.string().optional(),
  createdAt: z.string(),
  /** ID of the problem this was created from, for linking. */
  sourceId: z.string(),
});

export type ProblemVariation = z.infer<typeof ProblemVariationSchema>;

/**
 * Persisted AI-generated description and test cases for a problem.
 * Stored as description.json in the problem folder.
 * Includes interview-module-compatible fields for seamless integration.
 */
export const ProblemDescriptionSchema = z.object({
  problemId: z.string(),
  /** Full problem statement / description markdown */
  description: z.string(),
  /** Primary category (e.g., Arrays, Trees, Dynamic Programming) */
  category: z.string().optional(),
  /** Algorithm/data-structure tags */
  tags: z.array(z.string()).optional(),
  /** Constraints as bullet strings */
  constraints: z.array(z.string()),
  /** Description of function input */
  inputFormat: z.string().optional(),
  /** Description of expected output */
  outputFormat: z.string().optional(),
  /** Example test cases shown to the user */
  examples: z.array(TestCaseSchema),
  /** Edge cases with descriptions */
  edgeCases: z.array(EdgeCaseSchema).optional(),
  /** Hidden test cases used for validation */
  testCases: z.array(TestCaseSchema),
  /** Expected time complexity */
  timeComplexity: z.string().optional(),
  /** Expected space complexity */
  spaceComplexity: z.string().optional(),
  /** Companies known to ask this problem */
  companyTags: z.array(z.string()).optional(),
  /** Starter / boilerplate code */
  boilerplate: z.string().optional(),
  /** Variations generated from this problem */
  variations: z.array(ProblemVariationSchema).optional(),
  /** IDs of problems linked as similar */
  linkedSimilar: z.array(z.string()).optional(),
  generatedAt: z.string(),
  updatedAt: z.string(),
});

export type ProblemDescription = z.infer<typeof ProblemDescriptionSchema>;
