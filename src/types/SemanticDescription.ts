import { z } from "zod";

/**
 * Target depth level for AI-generated content on a specific item.
 * Overrides the global experience level config on a per-item basis.
 */
export const TargetLevelSchema = z.enum([
  "beginner",
  "intermediate",
  "senior",
  "staff",
  "principal",
]);

export type TargetLevel = z.infer<typeof TargetLevelSchema>;

/**
 * Semantic description attached to a Topic or Problem.
 *
 * Provides per-item context to the AI so that generated content
 * (overview, notes, patterns, examples, merge suggestions) is
 * tailored to the user's specific learning intent for this item.
 */
export const SemanticDescriptionSchema = z
  .object({
    /** What the user wants to get out of studying this item. */
    intent: z.string().optional(),
    /** Target depth level — overrides global experience config for this item. */
    targetLevel: TargetLevelSchema.optional(),
    /** Free-form context the AI should know when generating content. */
    context: z.string().optional(),
    /** What angle to emphasize: theory, implementation, interview, production, etc. */
    focus: z.array(z.string()).optional(),
    /** Key concepts the user already knows (skip in explanations). */
    knownConcepts: z.array(z.string()).optional(),
  })
  .optional();

export type SemanticDescription = z.infer<typeof SemanticDescriptionSchema>;
