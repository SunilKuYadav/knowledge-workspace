import type { Topic, FlashcardDeck, RevisionData } from '@/types';
import type { TopicRepository } from '@/repository';

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

  async createTopic(data: Omit<Topic, 'id' | 'createdAt' | 'updatedAt'>): Promise<Topic> {
    return this.repository.create(data);
  }

  async updateTopic(id: string, data: Partial<Topic>): Promise<Topic> {
    return this.repository.update(id, data);
  }

  async deleteTopic(id: string): Promise<void> {
    return this.repository.delete(id);
  }

  async getTopicContent(
    id: string,
    file: 'overview' | 'notes' | 'patterns' | 'mistakes'
  ): Promise<string> {
    return this.repository.getContent(id, file);
  }

  async saveTopicContent(
    id: string,
    file: 'overview' | 'notes' | 'patterns' | 'mistakes',
    content: string
  ): Promise<void> {
    return this.repository.saveContent(id, file, content);
  }

  async getFlashcards(id: string): Promise<FlashcardDeck> {
    return this.repository.getFlashcards(id);
  }

  async getRevision(id: string): Promise<RevisionData> {
    return this.repository.getRevision(id);
  }
}
