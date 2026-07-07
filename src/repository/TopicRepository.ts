import type { Topic, FlashcardDeck, RevisionData } from "@/types";
import type { Repository } from "./Repository";

/**
 * Repository interface for Topic entities.
 * Extends the generic Repository with topic-specific content
 * and revision operations.
 */
export interface TopicRepository extends Repository<Topic> {
  getContent(
    id: string,
    file: "overview" | "notes" | "patterns" | "mistakes",
  ): Promise<string>;
  saveContent(
    id: string,
    file: "overview" | "notes" | "patterns" | "mistakes",
    content: string,
  ): Promise<void>;
  getFlashcards(id: string): Promise<FlashcardDeck>;
  getRevision(id: string): Promise<RevisionData>;
}
