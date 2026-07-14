import type { Topic, FlashcardDeck, RevisionData, ArtifactType } from "@/types";
import type { TopicRepository, TopicPracticeData } from "@/repository";

/**
 * Application service for Topic operations.
 * Delegates to a TopicRepository instance, providing a decoupling
 * layer between UI and data access implementation.
 */
export class TopicService {
  constructor(private readonly repository: TopicRepository) {}

  async getAllTopics(): Promise<Topic[]> {
    return this.repository.getAll();
  }

  async getTopicById(id: string): Promise<Topic | null> {
    return this.repository.getById(id);
  }

  async createTopic(
    data: Omit<Topic, "id" | "createdAt" | "updatedAt">,
  ): Promise<Topic> {
    return this.repository.create(data);
  }

  async updateTopic(id: string, data: Partial<Topic>): Promise<Topic> {
    return this.repository.update(id, data);
  }

  async deleteTopic(id: string): Promise<void> {
    return this.repository.delete(id);
  }

  /**
   * Returns all present artifacts for a topic as a name → content map.
   * Only files that exist on disk are included.
   */
  async getArtifacts(id: string): Promise<Record<string, string>> {
    return this.repository.getArtifacts(id);
  }

  /**
   * Reads a single artifact file. Returns empty string if it doesn't exist.
   * Accepts any artifact name — not restricted to a fixed list.
   */
  async getTopicContent(
    id: string,
    file: ArtifactType | string,
  ): Promise<string> {
    return this.repository.getContent(id, file);
  }

  async saveTopicContent(
    id: string,
    file: ArtifactType | string,
    content: string,
  ): Promise<void> {
    return this.repository.saveContent(id, file, content);
  }

  async getFlashcards(id: string): Promise<FlashcardDeck> {
    return this.repository.getFlashcards(id);
  }

  async getRevision(id: string): Promise<RevisionData> {
    return this.repository.getRevision(id);
  }

  /**
   * Reads persisted practice problems for a topic.
   */
  async getPracticeProblems(id: string): Promise<TopicPracticeData | null> {
    return this.repository.getPracticeProblems(id);
  }

  /**
   * Saves the full practice problems data for a topic.
   */
  async savePracticeProblems(id: string, data: TopicPracticeData): Promise<void> {
    return this.repository.savePracticeProblems(id, data);
  }
}
