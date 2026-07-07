import type { Problem, RevisionData } from "@/types";
import type { Repository } from "./Repository";

/**
 * Repository interface for Problem entities.
 * Extends the generic Repository with problem-specific content
 * and revision operations.
 */
export interface ProblemRepository extends Repository<Problem> {
  getNotes(id: string): Promise<string>;
  saveNotes(id: string, content: string): Promise<void>;
  getSolution(id: string): Promise<string>;
  saveSolution(id: string, content: string): Promise<void>;
  getRevision(id: string): Promise<RevisionData>;
}
