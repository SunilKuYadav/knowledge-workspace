import { rm } from "fs/promises";
import path from "path";
import type { Problem, RevisionData, ProblemDescription } from "@/types";
import type { ProblemRepository } from "@/repository";
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
 * Lowercases, replaces non-alphanumeric sequences with hyphens,
 * and strips leading/trailing hyphens.
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * File-system-backed implementation of ProblemRepository.
 * Stores problems as folders under problems/{platform}/{slug}/ in the workspace.
 */
export class FileProblemRepository implements ProblemRepository {
  private basePath: string;

  constructor(workspacePath: string) {
    this.basePath = path.join(workspacePath, "problems");
  }

  /**
   * Scans all platform subdirectories and reads problem.json from each slug folder.
   */
  async getAll(): Promise<Problem[]> {
    const problems: Problem[] = [];

    for (const platform of WORKSPACE_STRUCTURE.problems) {
      const platformPath = path.join(this.basePath, platform);
      const slugDirs = await listDirectories(platformPath);

      for (const slug of slugDirs) {
        const problemJson = await readJsonFile<Problem>(
          path.join(platformPath, slug, "problem.json"),
        );
        if (problemJson) {
          problems.push(problemJson);
        }
      }
    }

    return problems;
  }

  /**
   * Searches across all platform directories for a matching slug folder.
   */
  async getById(id: string): Promise<Problem | null> {
    for (const platform of WORKSPACE_STRUCTURE.problems) {
      const problemPath = path.join(
        this.basePath,
        platform,
        id,
        "problem.json",
      );
      const problem = await readJsonFile<Problem>(problemPath);
      if (problem) {
        return problem;
      }
    }
    return null;
  }

  /**
   * Creates a new problem folder with problem.json, notes.md, and solution.md.
   * Generates slug ID from title and places folder under the platform subdirectory.
   */
  async create(
    data: Omit<Problem, "id" | "createdAt" | "updatedAt">,
  ): Promise<Problem> {
    const id = generateSlug(data.title);
    const now = new Date().toISOString();

    const problem: Problem = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    };

    const folderPath = path.join(this.basePath, data.platform, id);
    await ensureDirectoryExists(folderPath);

    await writeJsonFile(path.join(folderPath, "problem.json"), problem);
    await writeMarkdownFile(path.join(folderPath, "notes.md"), "");
    await writeMarkdownFile(path.join(folderPath, "solution.md"), "");

    return problem;
  }

  /**
   * Merges partial data with existing problem.json and writes back.
   */
  async update(id: string, data: Partial<Problem>): Promise<Problem> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Problem not found: ${id}`);
    }

    const updated: Problem = {
      ...existing,
      ...data,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    const folderPath = path.join(this.basePath, existing.platform, id);
    await writeJsonFile(path.join(folderPath, "problem.json"), updated);

    return updated;
  }

  /**
   * Removes the problem folder recursively.
   */
  async delete(id: string): Promise<void> {
    for (const platform of WORKSPACE_STRUCTURE.problems) {
      const folderPath = path.join(this.basePath, platform, id);
      const problem = await readJsonFile<Problem>(
        path.join(folderPath, "problem.json"),
      );
      if (problem) {
        await rm(folderPath, { recursive: true, force: true });
        return;
      }
    }
  }

  /**
   * Reads notes.md from the problem folder.
   */
  async getNotes(id: string): Promise<string> {
    const folderPath = await this.findProblemFolder(id);
    if (!folderPath) return "";
    return readMarkdownFile(path.join(folderPath, "notes.md"));
  }

  /**
   * Writes content to notes.md in the problem folder.
   */
  async saveNotes(id: string, content: string): Promise<void> {
    const folderPath = await this.findProblemFolder(id);
    if (!folderPath) {
      throw new Error(`Problem not found: ${id}`);
    }
    await writeMarkdownFile(path.join(folderPath, "notes.md"), content);
  }

  /**
   * Reads solution.md from the problem folder.
   */
  async getSolution(id: string): Promise<string> {
    const folderPath = await this.findProblemFolder(id);
    if (!folderPath) return "";
    return readMarkdownFile(path.join(folderPath, "solution.md"));
  }

  /**
   * Writes content to solution.md in the problem folder.
   */
  async saveSolution(id: string, content: string): Promise<void> {
    const folderPath = await this.findProblemFolder(id);
    if (!folderPath) {
      throw new Error(`Problem not found: ${id}`);
    }
    await writeMarkdownFile(path.join(folderPath, "solution.md"), content);
  }

  /**
   * Reads revision.json from the problem folder.
   * Returns default RevisionData if the file does not exist.
   */
  async getRevision(id: string): Promise<RevisionData> {
    const folderPath = await this.findProblemFolder(id);
    if (!folderPath) {
      return this.defaultRevisionData(id);
    }

    const revision = await readJsonFile<RevisionData>(
      path.join(folderPath, "revision.json"),
    );
    return revision ?? this.defaultRevisionData(id);
  }

  /**
   * Reads description.json from the problem folder.
   * Returns null if not yet generated.
   */
  async getDescription(id: string): Promise<ProblemDescription | null> {
    const folderPath = await this.findProblemFolder(id);
    if (!folderPath) return null;
    return readJsonFile<ProblemDescription>(
      path.join(folderPath, "description.json"),
    );
  }

  /**
   * Writes description.json to the problem folder.
   */
  async saveDescription(id: string, description: ProblemDescription): Promise<void> {
    const folderPath = await this.findProblemFolder(id);
    if (!folderPath) throw new Error(`Problem not found: ${id}`);
    await writeJsonFile(path.join(folderPath, "description.json"), description);
  }

  /**
   * Locates the problem folder by searching across all platform directories.
   * Returns the full path to the problem folder, or null if not found.
   */
  private async findProblemFolder(id: string): Promise<string | null> {
    for (const platform of WORKSPACE_STRUCTURE.problems) {
      const folderPath = path.join(this.basePath, platform, id);
      const problem = await readJsonFile<Problem>(
        path.join(folderPath, "problem.json"),
      );
      if (problem) {
        return folderPath;
      }
    }
    return null;
  }

  /**
   * Returns default RevisionData for a problem that has no revision.json.
   */
  private defaultRevisionData(id: string): RevisionData {
    return {
      itemId: id,
      itemType: "problem",
      lastReviewed: null,
      nextReview: new Date().toISOString(),
      confidence: 1,
      history: [],
    };
  }
}
