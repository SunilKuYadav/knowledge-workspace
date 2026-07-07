import type { Problem, RevisionData } from "@/types";
import type { ProblemRepository } from "@/repository";

/**
 * Application service for Problem operations.
 * Delegates to a ProblemRepository instance, providing a decoupling
 * layer between UI and data access implementation.
 */
export class ProblemService {
  constructor(private readonly repository: ProblemRepository) {}

  async getAllProblems(): Promise<Problem[]> {
    return this.repository.getAll();
  }

  async getProblemById(id: string): Promise<Problem | null> {
    return this.repository.getById(id);
  }

  async createProblem(
    data: Omit<Problem, "id" | "createdAt" | "updatedAt">,
  ): Promise<Problem> {
    return this.repository.create(data);
  }

  async updateProblem(id: string, data: Partial<Problem>): Promise<Problem> {
    return this.repository.update(id, data);
  }

  async deleteProblem(id: string): Promise<void> {
    return this.repository.delete(id);
  }

  async getNotes(id: string): Promise<string> {
    return this.repository.getNotes(id);
  }

  async saveNotes(id: string, content: string): Promise<void> {
    return this.repository.saveNotes(id, content);
  }

  async getSolution(id: string): Promise<string> {
    return this.repository.getSolution(id);
  }

  async saveSolution(id: string, content: string): Promise<void> {
    return this.repository.saveSolution(id, content);
  }

  async getRevision(id: string): Promise<RevisionData> {
    return this.repository.getRevision(id);
  }
}
