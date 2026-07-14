import path from "path";
import { rm, readdir } from "fs/promises";
import type { Topic, FlashcardDeck, RevisionData, ArtifactType } from "@/types";
import { ARTIFACT_ORDER } from "@/types";
import type { TopicRepository, TopicPracticeData } from "@/repository";
import { WORKSPACE_STRUCTURE } from "../lib/constants";
import {
  readJsonFile,
  writeJsonFile,
  readMarkdownFile,
  writeMarkdownFile,
  listDirectories,
  ensureDirectoryExists,
} from "./workspace";

/**
 * Generates a URL-safe slug from a title string.
 * Lowercase, replaces non-alphanumeric sequences with hyphens, trims leading/trailing hyphens.
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * FileTopicRepository implements TopicRepository using the local filesystem.
 * Topics are stored as folders under `notes/{category}/{slug}/` with
 * topic.json metadata and associated Markdown content files.
 *
 * Content discovery is file-driven: `getArtifacts()` reads whatever `.md` files
 * exist in the topic folder, so new artifact types require no code changes.
 */
export class FileTopicRepository implements TopicRepository {
  private basePath: string;

  constructor(workspacePath: string) {
    this.basePath = path.join(workspacePath, "notes");
  }

  /**
   * Scans all category subdirectories and reads topic.json from each topic folder.
   */
  async getAll(): Promise<Topic[]> {
    const topics: Topic[] = [];

    for (const category of WORKSPACE_STRUCTURE.notes) {
      const categoryPath = path.join(this.basePath, category);
      const slugDirs = await listDirectories(categoryPath);

      for (const slug of slugDirs) {
        const topicJsonPath = path.join(categoryPath, slug, "topic.json");
        const topic = await readJsonFile<Topic>(topicJsonPath);
        if (topic) {
          topics.push(topic);
        }
      }
    }

    return topics;
  }

  /**
   * Locates a topic by its slug ID across all category directories.
   */
  async getById(id: string): Promise<Topic | null> {
    const topicPath = await this.findTopicPath(id);
    if (!topicPath) {
      return null;
    }

    return readJsonFile<Topic>(path.join(topicPath, "topic.json"));
  }

  /**
   * Creates a new topic folder with topic.json and a minimal overview.md.
   * Only overview.md is written by default — all other artifacts are optional
   * and created on demand (via AI generation or manual editing).
   */
  async create(
    data: Omit<Topic, "id" | "createdAt" | "updatedAt">,
  ): Promise<Topic> {
    const slug = generateSlug(data.title);
    const now = new Date().toISOString();

    const topic: Topic = {
      ...data,
      id: slug,
      slug,
      prerequisites: data.prerequisites ?? [],
      relatedTopics: data.relatedTopics ?? [],
      relatedProblemIds: data.relatedProblemIds ?? [],
      createdAt: now,
      updatedAt: now,
    };

    const topicDir = path.join(this.basePath, data.category, slug);
    await ensureDirectoryExists(topicDir);

    // Write topic.json metadata
    await writeJsonFile(path.join(topicDir, "topic.json"), topic);

    // Only write overview.md as the initial artifact.
    // All others are created on demand.
    await writeMarkdownFile(
      path.join(topicDir, "overview.md"),
      `# ${data.title}\n\n`,
    );

    return topic;
  }

  /**
   * Merges partial data with the existing topic.json and writes the updated file.
   */
  async update(id: string, data: Partial<Topic>): Promise<Topic> {
    const topicPath = await this.findTopicPath(id);
    if (!topicPath) {
      throw new Error(`Topic not found: ${id}`);
    }

    const existing = await readJsonFile<Topic>(
      path.join(topicPath, "topic.json"),
    );
    if (!existing) {
      throw new Error(`Topic metadata not found: ${id}`);
    }

    const updated: Topic = {
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    await writeJsonFile(path.join(topicPath, "topic.json"), updated);
    return updated;
  }

  /**
   * Removes the entire topic folder recursively.
   */
  async delete(id: string): Promise<void> {
    const topicPath = await this.findTopicPath(id);
    if (!topicPath) {
      throw new Error(`Topic not found: ${id}`);
    }

    await rm(topicPath, { recursive: true, force: true });
  }

  /**
   * Discovers all `.md` files that currently exist in the topic folder and
   * returns a map of artifact name → content, sorted by ARTIFACT_ORDER.
   *
   * Only present files are included — empty/missing files are omitted,
   * so the UI can render exactly what exists with no hardcoded list.
   */
  async getArtifacts(id: string): Promise<Record<string, string>> {
    const topicPath = await this.findTopicPath(id);
    if (!topicPath) {
      return {};
    }

    // List all .md files in the topic directory
    let entries: string[] = [];
    try {
      const dirEntries = await readdir(topicPath);
      entries = dirEntries.filter((f) => f.endsWith(".md"));
    } catch {
      return {};
    }

    // Extract artifact names (strip .md extension)
    const artifactNames = entries.map((f) => f.replace(/\.md$/, ""));

    // Sort by ARTIFACT_ORDER; unknown artifacts go to the end
    const ordered = [...artifactNames].sort((a, b) => {
      const ai = ARTIFACT_ORDER.indexOf(a as ArtifactType);
      const bi = ARTIFACT_ORDER.indexOf(b as ArtifactType);
      const aIdx = ai === -1 ? Infinity : ai;
      const bIdx = bi === -1 ? Infinity : bi;
      return aIdx - bIdx;
    });

    // Read all files in parallel
    const entries2 = await Promise.all(
      ordered.map(async (name) => {
        const content = await readMarkdownFile(
          path.join(topicPath, `${name}.md`),
        );
        return [name, content] as [string, string];
      }),
    );

    // Return only non-empty artifacts
    return Object.fromEntries(entries2.filter(([, content]) => content.trim().length > 0));
  }

  /**
   * Reads a single content artifact from the topic folder.
   * Accepts any artifact name — returns empty string if the file does not exist.
   */
  async getContent(id: string, file: ArtifactType | string): Promise<string> {
    const topicPath = await this.findTopicPath(id);
    if (!topicPath) {
      return "";
    }

    return readMarkdownFile(path.join(topicPath, `${file}.md`));
  }

  /**
   * Writes content to a named artifact file in the topic folder.
   * Creates the file if it doesn't exist.
   */
  async saveContent(
    id: string,
    file: ArtifactType | string,
    content: string,
  ): Promise<void> {
    const topicPath = await this.findTopicPath(id);
    if (!topicPath) {
      throw new Error(`Topic not found: ${id}`);
    }

    await writeMarkdownFile(path.join(topicPath, `${file}.md`), content);
  }

  /**
   * Reads the flashcards.json from the topic folder.
   * Returns an empty deck if the file does not exist.
   */
  async getFlashcards(id: string): Promise<FlashcardDeck> {
    const topicPath = await this.findTopicPath(id);
    if (!topicPath) {
      return { topicId: id, cards: [] };
    }

    const deck = await readJsonFile<FlashcardDeck>(
      path.join(topicPath, "flashcards.json"),
    );

    return deck ?? { topicId: id, cards: [] };
  }

  /**
   * Reads the revision.json from the topic folder.
   * Returns default RevisionData if the file does not exist.
   */
  async getRevision(id: string): Promise<RevisionData> {
    const topicPath = await this.findTopicPath(id);
    if (!topicPath) {
      return this.defaultRevisionData(id);
    }

    const revision = await readJsonFile<RevisionData>(
      path.join(topicPath, "revision.json"),
    );

    return revision ?? this.defaultRevisionData(id);
  }

  /**
   * Reads persisted practice problems for a topic.
   * Returns null if no practice-problems.json exists yet.
   */
  async getPracticeProblems(id: string): Promise<TopicPracticeData | null> {
    const topicPath = await this.findTopicPath(id);
    if (!topicPath) {
      return null;
    }

    return readJsonFile<TopicPracticeData>(
      path.join(topicPath, "practice-problems.json"),
    );
  }

  /**
   * Writes the full practice problems data for a topic.
   */
  async savePracticeProblems(id: string, data: TopicPracticeData): Promise<void> {
    const topicPath = await this.findTopicPath(id);
    if (!topicPath) {
      throw new Error(`Topic not found: ${id}`);
    }

    await writeJsonFile(path.join(topicPath, "practice-problems.json"), data);
  }

  /**
   * Searches all category directories for a folder matching the given slug ID.
   * Returns the full path to the topic folder, or null if not found.
   */
  private async findTopicPath(id: string): Promise<string | null> {
    for (const category of WORKSPACE_STRUCTURE.notes) {
      const candidatePath = path.join(this.basePath, category, id);
      const topicJson = await readJsonFile<Topic>(
        path.join(candidatePath, "topic.json"),
      );
      if (topicJson) {
        return candidatePath;
      }
    }
    return null;
  }

  /**
   * Returns default RevisionData for a topic that has no revision.json yet.
   */
  private defaultRevisionData(id: string): RevisionData {
    return {
      itemId: id,
      itemType: "topic",
      lastReviewed: null,
      nextReview: new Date().toISOString(),
      confidence: 1,
      history: [],
    };
  }
}
