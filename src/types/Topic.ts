import { z } from "zod";

/**
 * Zod schema for a Topic — a self-contained study subject folder
 * within the workspace containing metadata and content files.
 */
export const TopicSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string().optional(),
  category: z.enum([
    "dsa",
    "system-design",
    "database",
    "networking",
    "os",
    "oop",
  ]),
  /**
   * Parent topic id. Used for sub-topics (e.g. "binary-search-tree" → parent "trees").
   */
  parent: z.string().nullable().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  status: z.enum(["not-started", "in-progress", "completed"]),
  confidence: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  /**
   * Estimated study time in minutes. Drives "learn these first" scheduling.
   */
  estimatedMinutes: z.number().optional(),
  /**
   * Topic ids that should be understood before studying this topic.
   * Powers the "learn these first" graph.
   */
  prerequisites: z.array(z.string()).optional(),
  /**
   * Topic ids that are conceptually related or naturally studied next.
   * Powers the "learn next" graph.
   */
  relatedTopics: z.array(z.string()).optional(),
  /**
   * Problem IDs that are linked to this topic.
   * Cross-linked with Problem.relatedTopicIds for bidirectional navigation.
   */
  relatedProblemIds: z.array(z.string()).optional(),
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** A study topic with metadata, category, difficulty, confidence, and learning graph edges. */
export type Topic = z.infer<typeof TopicSchema>;
