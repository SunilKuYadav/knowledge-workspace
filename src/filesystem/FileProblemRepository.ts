import { rm } from "fs/promises";
import path from "path";
import type { Problem, RevisionData, ProblemDescription } from "@/types";
import type { ProblemRepository } from "@/repository";
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
 * Stores problems as folders under problems/{slug}/ in the workspace.
 */
export class FileProblemRepository implements ProblemRepository {
  private basePath: string;

  constructor(workspacePath: string) {
    this.basePath = path.join(workspacePath, "problems");
  }

  /**
   * Scans all subdirectories under problems/ and reads problem.json from each.
   */
  async getAll(): Promise<Problem[]> {
    const problems: Problem[] = [];
    const slugDirs = await listDirectories(this.basePath);

    for (const slug of slugDirs) {
      const problemJson = await readJsonFile<Problem>(
        path.join(this.basePath, slug, "problem.json"),
      );
      if (problemJson) {
        problems.push(problemJson);
      }
    }

    return problems;
  }

  /**
   * Reads problem.json from the matching slug folder.
   */
  async getById(id: string): Promise<Problem | null> {
    const problemPath = path.join(this.basePath, id, "problem.json");
    return readJsonFile<Problem>(problemPath);
  }

  /**
   * Creates a new problem folder with problem.json, notes.md, and solution.md.
   * Generates slug ID from title and places folder directly under problems/.
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

    const folderPath = path.join(this.basePath, id);
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

    const folderPath = path.join(this.basePath, id);
    await writeJsonFile(path.join(folderPath, "problem.json"), updated);

    return updated;
  }

  /**
   * Removes the problem folder recursively.
   */
  async delete(id: string): Promise<void> {
    const folderPath = path.join(this.basePath, id);
    const problem = await readJsonFile<Problem>(
      path.join(folderPath, "problem.json"),
    );
    if (problem) {
      await rm(folderPath, { recursive: true, force: true });
    }
  }

  /**
   * Reads notes.md from the problem folder.
   */
  async getNotes(id: string): Promise<string> {
    const folderPath = path.join(this.basePath, id);
    return readMarkdownFile(path.join(folderPath, "notes.md"));
  }

  /**
   * Writes content to notes.md in the problem folder.
   */
  async saveNotes(id: string, content: string): Promise<void> {
    const folderPath = path.join(this.basePath, id);
    const problem = await this.getById(id);
    if (!problem) {
      throw new Error(`Problem not found: ${id}`);
    }
    await writeMarkdownFile(path.join(folderPath, "notes.md"), content);
  }

  /**
   * Reads solution code from the problem folder (solution.md with code blocks).
   */
  async getSolution(id: string): Promise<string> {
    const folderPath = path.join(this.basePath, id);
    return readMarkdownFile(path.join(folderPath, "solution.md"));
  }

  /**
   * Saves solution code to solution.md in the problem folder.
   * Wraps code in a markdown code block with timestamp header.
   * Appends to existing solutions so the user can keep multiple.
   */
  async saveSolution(id: string, content: string): Promise<void> {
    const folderPath = path.join(this.basePath, id);
    const problem = await this.getById(id);
    if (!problem) {
      throw new Error(`Problem not found: ${id}`);
    }
    const existing = await readMarkdownFile(path.join(folderPath, "solution.md"));
    const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19);
    const entry = `## Solution — ${timestamp}\n\n\`\`\`typescript\n${content}\n\`\`\`\n`;
    const newContent = existing ? `${existing}\n---\n\n${entry}` : entry;
    await writeMarkdownFile(path.join(folderPath, "solution.md"), newContent);
  }

  /**
   * Overwrites solution.md with the provided content directly.
   * Used when the user edits the full solution file.
   */
  async overwriteSolution(id: string, content: string): Promise<void> {
    const folderPath = path.join(this.basePath, id);
    const problem = await this.getById(id);
    if (!problem) {
      throw new Error(`Problem not found: ${id}`);
    }
    await writeMarkdownFile(path.join(folderPath, "solution.md"), content);
  }

  /**
   * Writes the current code draft to draft.txt in the problem folder.
   * Used for periodic auto-save while the user is coding.
   */
  async saveDraft(id: string, content: string): Promise<void> {
    const folderPath = path.join(this.basePath, id);
    await ensureDirectoryExists(folderPath);
    await writeMarkdownFile(path.join(folderPath, "draft.txt"), content);
  }

  /**
   * Reads the draft.txt file from the problem folder.
   * Returns empty string if no draft exists.
   */
  async getDraft(id: string): Promise<string> {
    const folderPath = path.join(this.basePath, id);
    return readMarkdownFile(path.join(folderPath, "draft.txt"));
  }

  /**
   * Reads revision.json from the problem folder.
   * Returns default RevisionData if the file does not exist.
   */
  async getRevision(id: string): Promise<RevisionData> {
    const folderPath = path.join(this.basePath, id);
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
    const folderPath = path.join(this.basePath, id);
    return readJsonFile<ProblemDescription>(
      path.join(folderPath, "description.json"),
    );
  }

  /**
   * Writes description.json to the problem folder.
   */
  async saveDescription(id: string, description: ProblemDescription): Promise<void> {
    const folderPath = path.join(this.basePath, id);
    const problem = await this.getById(id);
    if (!problem) throw new Error(`Problem not found: ${id}`);
    await writeJsonFile(path.join(folderPath, "description.json"), description);
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

  // ─── Structured Solutions (solutions.json) ───────────────────────────────

  /**
   * Reads the structured solutions array from solutions.json.
   * Falls back to parsing solution.md if solutions.json doesn't exist (migration).
   */
  async getStructuredSolutions(id: string): Promise<SolutionEntry[]> {
    const folderPath = path.join(this.basePath, id);
    const solutions = await readJsonFile<SolutionEntry[]>(
      path.join(folderPath, "solutions.json"),
    );
    if (solutions) return solutions;

    // Migrate from solution.md if it exists
    const md = await readMarkdownFile(path.join(folderPath, "solution.md"));
    if (!md.trim()) return [];
    return parseSolutionMd(md);
  }

  /**
   * Writes the structured solutions array to solutions.json.
   */
  async saveStructuredSolutions(id: string, solutions: SolutionEntry[]): Promise<void> {
    const folderPath = path.join(this.basePath, id);
    await ensureDirectoryExists(folderPath);
    await writeJsonFile(path.join(folderPath, "solutions.json"), solutions);
  }

  /**
   * Adds a new structured solution entry.
   */
  async addStructuredSolution(id: string, entry: SolutionEntry): Promise<SolutionEntry[]> {
    const existing = await this.getStructuredSolutions(id);
    const updated = [...existing, entry];
    await this.saveStructuredSolutions(id, updated);
    return updated;
  }
}

/** A single saved solution with metadata */
export interface SolutionEntry {
  id: string;
  code: string;
  savedAt: string;
  score?: number;
  feedback?: string;
  complexity?: { time: string; space: string };
  strengths?: string[];
  improvements?: string[];
  edgeCases?: string[];
  alternativeApproaches?: string[];
  /** Note attached to this specific solution */
  note?: string;
  /** If this solution is for a variation, stores the variation ID */
  variationId?: string;
  /** Title of the variation (for display in solution tab) */
  variationTitle?: string;
}

/**
 * Parse legacy solution.md into structured entries.
 * Format: sections separated by "---", each starting with "## Solution — YYYY-MM-DD HH:mm:ss"
 */
function parseSolutionMd(md: string): SolutionEntry[] {
  const sections = md.split(/\n---\n/).map((s) => s.trim()).filter(Boolean);
  const entries: SolutionEntry[] = [];

  for (const section of sections) {
    const headerMatch = section.match(/^## Solution\s*—\s*(.+)$/m);
    const codeMatch = section.match(/```(?:typescript|ts|javascript|js)?\n([\s\S]*?)```/);
    const savedAt = headerMatch?.[1]?.trim() || new Date().toISOString();
    const code = codeMatch?.[1]?.trim() || section;

    entries.push({
      id: `legacy-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      code,
      savedAt,
    });
  }

  return entries;
}
