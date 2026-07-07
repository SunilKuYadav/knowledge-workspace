import { z } from "zod";

/** Confidence level on a 1-5 scale used across revision tracking. */
export const ConfidenceSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

/**
 * Zod schema for a single revision history entry.
 */
export const RevisionEntrySchema = z.object({
  id: z.string(),
  date: z.string(),
  confidence: ConfidenceSchema,
  notes: z.string().optional(),
});

/** A single entry in a revision history log. */
export type RevisionEntry = z.infer<typeof RevisionEntrySchema>;

/**
 * Zod schema for the complete revision data associated with a topic or problem.
 */
export const RevisionDataSchema = z.object({
  itemId: z.string(),
  itemType: z.enum(["topic", "problem"]),
  lastReviewed: z.string().nullable(),
  nextReview: z.string(),
  confidence: ConfidenceSchema,
  history: z.array(RevisionEntrySchema),
});

/** Full revision tracking data for a topic or problem, including schedule and history. */
export type RevisionData = z.infer<typeof RevisionDataSchema>;
