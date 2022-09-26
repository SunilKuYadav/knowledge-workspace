import { z } from 'zod';

/**
 * Zod schema for a single flashcard.
 */
export const FlashcardSchema = z.object({
  id: z.string(),
  front: z.string(),
  back: z.string(),
  tags: z.array(z.string()),
  topicId: z.string(),
  createdAt: z.string(),
});

/** A flashcard with front/back content, tags, and associated topic. */
export type Flashcard = z.infer<typeof FlashcardSchema>;

/**
 * Zod schema for a deck of flashcards grouped by topic.
 */
export const FlashcardDeckSchema = z.object({
  topicId: z.string(),
  cards: z.array(FlashcardSchema),
});

/** A collection of flashcards associated with a specific topic. */
export type FlashcardDeck = z.infer<typeof FlashcardDeckSchema>;
