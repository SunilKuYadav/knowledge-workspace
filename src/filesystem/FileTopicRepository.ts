import path from "path";
import { rm } from "fs/promises";
import type { Topic, FlashcardDeck, RevisionData } from "@/types";
import type { TopicRepository } from "@/repository";
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
   * Creates a new topic folder with topic.json and all template Markdown files.
   * Generates a slug ID from the title and places it in the correct category subdirectory.
   */
  async create(
    data: Omit<Topic, "id" | "createdAt" | "updatedAt">,
  ): Promise<Topic> {
    const slug = generateSlug(data.title);
    const now = new Date().toISOString();

    const topic: Topic = {
      ...data,
      id: slug,
      createdAt: now,
      updatedAt: now,
    };

    const topicDir = path.join(this.basePath, data.category, slug);
    await ensureDirectoryExists(topicDir);

    // Write topic.json metadata
    await writeJsonFile(path.join(topicDir, "topic.json"), topic);

    // Write template Markdown files
    await writeMarkdownFile(
      path.join(topicDir, "overview.md"),
      `# ${data.title}\n\n## Overview\n\n`,
    );
    await writeMarkdownFile(
      path.join(topicDir, "notes.md"),
      `# ${data.title} - Notes\n\n`,
    );
    await writeMarkdownFile(
      path.join(topicDir, "patterns.md"),
      `# ${data.title} - Patterns\n\n`,
    );
    await writeMarkdownFile(
      path.join(topicDir, "mistakes.md"),
      `# ${data.title} - Common Mistakes\n\n`,
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
      id: existing.id, // Preserve original ID
      createdAt: existing.createdAt, // Preserve creation date
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
   * Reads a content Markdown file (overview, notes, patterns, or mistakes) from the topic folder.
   * Returns an empty string if the file does not exist.
   */
  async getContent(
    id: string,
    file: "overview" | "notes" | "patterns" | "mistakes",
  ): Promise<string> {
    const topicPath = await this.findTopicPath(id);
    if (!topicPath) {
      return "";
    }

    return readMarkdownFile(path.join(topicPath, `${file}.md`));
  }

  /**
   * Writes content to a Markdown file in the topic folder.
   */
  async saveContent(
    id: string,
    file: "overview" | "notes" | "patterns" | "mistakes",
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
