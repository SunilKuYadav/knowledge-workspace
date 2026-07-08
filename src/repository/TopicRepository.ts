import type { Topic, FlashcardDeck, RevisionData, ArtifactType } from "@/types";
import type { Repository } from "./Repository";

/**
 * Repository interface for Topic entities.
 * Extends the generic Repository with topic-specific content
 * and revision operations.
 *
 * Content operations accept any ArtifactType string so the repository
 * remains open to new artifact types without interface changes.
 */
export interface TopicRepository extends Repository<Topic> {
  /**
   * Returns a map of artifact name → markdown content for all `.md` files
   * that exist in the topic folder. Only present files are included.
   */
  getArtifacts(id: string): Promise<Record<string, string>>;
  getContent(id: string, file: ArtifactType | string): Promise<string>;
  saveContent(id: string, file: ArtifactType | string, content: string): Promise<void>;
  getFlashcards(id: string): Promise<FlashcardDeck>;
  getRevision(id: string): Promise<RevisionData>;
}
