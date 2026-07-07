import { z } from "zod";

/**
 * Zod schema for a Topic — a self-contained study subject folder
 * within the workspace containing metadata and content files.
 */
export const TopicSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.enum([
    "dsa",
    "system-design",
    "database",
    "networking",
    "os",
    "oop",
  ]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  status: z.enum(["not-started", "in-progress", "completed"]),
  confidence: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** A study topic with metadata, category, difficulty, and confidence level. */
export type Topic = z.infer<typeof TopicSchema>;
