import { z } from "zod";

/**
 * Zod schema for a Problem — a coding problem folder containing
 * metadata, notes, solution files, and revision data.
 */
export const ProblemSchema = z.object({
  id: z.string(),
  title: z.string(),
  platform: z.enum(["leetcode", "codeforces", "gfg"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  companies: z.array(z.string()),
  patterns: z.array(z.string()),
  status: z.enum(["not-started", "attempted", "solved"]),
  favorite: z.boolean(),
  url: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** A coding problem with platform, difficulty, companies, and solution status. */
export type Problem = z.infer<typeof ProblemSchema>;
