import type { Topic, FlashcardDeck, RevisionData, ArtifactType } from "@/types";
import type { Repository } from "./Repository";

/**
 * A practice problem generated from AI suggestions and persisted to a topic.
 */
export interface TopicPracticeProblem {
  id: string;
  suggestionId: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  description: string;
  constraints: string[];
  examples: { input: string; expectedOutput: string; explanation?: string }[];
  testCases: { input: string; expectedOutput: string }[];
  boilerplate: string;
  timeComplexity?: string;
  spaceComplexity?: string;
  patterns: string[];
  /** User's saved solution code */
  savedSolution?: string;
  /** Last evaluation score (0-100) */
  lastScore?: number;
  /** ISO date of creation */
  createdAt: string;
}

/**
 * A suggested problem from AI — persisted so the user doesn't
 * have to regenerate suggestions every time they visit the tab.
 */
export interface TopicPracticeSuggestion {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  description: string;
  patterns: string[];
  companies: string[];
  rationale: string;
  /** Whether a full problem has been generated from this suggestion */
  generated: boolean;
}

/**
 * Persisted practice data for a topic.
 */
export interface TopicPracticeData {
  topicId: string;
  /** AI-suggested problems (persisted so they don't regenerate on every visit) */
  suggestions: TopicPracticeSuggestion[];
  /** Fully generated problems ready for practice */
  problems: TopicPracticeProblem[];
  updatedAt: string;
}

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

  /**
   * Reads persisted practice problems for a topic.
   * Returns null if no practice data exists yet.
   */
  getPracticeProblems(id: string): Promise<TopicPracticeData | null>;

  /**
   * Writes the full practice problems data for a topic.
   */
  savePracticeProblems(id: string, data: TopicPracticeData): Promise<void>;
}
