import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "path";
import { mkdtemp, rm, readFile } from "fs/promises";
import { tmpdir } from "os";
import { FileProblemRepository } from "../FileProblemRepository";
import type { Problem } from "@/types";

describe("FileProblemRepository", () => {
  let tempDir: string;
  let repo: FileProblemRepository;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "problem-repo-test-"));
    repo = new FileProblemRepository(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  const sampleProblemInput = {
    title: "Two Sum",
    difficulty: "easy" as const,
    companies: ["Google", "Amazon"],
    patterns: ["hash-map", "two-pointers"],
    status: "solved" as const,
    favorite: true,
    url: "https://leetcode.com/problems/two-sum/",
  };

  describe("create", () => {
    it("creates problem folder with problem.json, notes.md, and solution.md", async () => {
      const problem = await repo.create(sampleProblemInput);

      expect(problem.id).toBe("two-sum");
      expect(problem.title).toBe("Two Sum");
      expect(problem.createdAt).toBeDefined();
      expect(problem.updatedAt).toBeDefined();

      // Verify files exist
      const folderPath = path.join(tempDir, "problems", "two-sum");
      const problemJson = JSON.parse(
        await readFile(path.join(folderPath, "problem.json"), "utf-8"),
      );
      expect(problemJson.id).toBe("two-sum");

      const notes = await readFile(path.join(folderPath, "notes.md"), "utf-8");
      expect(notes).toBe("");

      const solution = await readFile(
        path.join(folderPath, "solution.md"),
        "utf-8",
      );
      expect(solution).toBe("");
    });

    it("generates slug from title correctly", async () => {
      const problem = await repo.create({
        ...sampleProblemInput,
        title: "Binary Tree Level Order Traversal",
      });
      expect(problem.id).toBe("binary-tree-level-order-traversal");
    });

    it("handles special characters in title", async () => {
      const problem = await repo.create({
        ...sampleProblemInput,
        title: "Valid Parentheses (Stack)",
      });
      expect(problem.id).toBe("valid-parentheses-stack");
    });
  });

  describe("getAll", () => {
    it("returns empty array when no problems exist", async () => {
      const problems = await repo.getAll();
      expect(problems).toEqual([]);
    });

    it("returns all problems", async () => {
      await repo.create(sampleProblemInput);
      await repo.create({
        ...sampleProblemInput,
        title: "Rating Change",
      });

      const problems = await repo.getAll();
      expect(problems).toHaveLength(2);
      expect(problems.map((p) => p.id)).toContain("two-sum");
      expect(problems.map((p) => p.id)).toContain("rating-change");
    });
  });

  describe("getById", () => {
    it("returns problem by slug id", async () => {
      await repo.create(sampleProblemInput);

      const problem = await repo.getById("two-sum");
      expect(problem).not.toBeNull();
      expect(problem!.title).toBe("Two Sum");
    });

    it("returns null for non-existent problem", async () => {
      const problem = await repo.getById("nonexistent");
      expect(problem).toBeNull();
    });
  });

  describe("update", () => {
    it("merges partial data with existing problem", async () => {
      await repo.create(sampleProblemInput);

      const updated = await repo.update("two-sum", {
        status: "attempted",
        favorite: false,
      });

      expect(updated.status).toBe("attempted");
      expect(updated.favorite).toBe(false);
      expect(updated.title).toBe("Two Sum");
      expect(updated.id).toBe("two-sum");
    });

    it("updates the updatedAt timestamp", async () => {
      const created = await repo.create(sampleProblemInput);

      // Small delay to ensure different timestamp
      await new Promise((r) => setTimeout(r, 10));

      const updated = await repo.update("two-sum", { status: "attempted" });
      expect(updated.updatedAt).not.toBe(created.createdAt);
    });

    it("throws for non-existent problem", async () => {
      await expect(
        repo.update("nonexistent", { status: "attempted" }),
      ).rejects.toThrow("Problem not found: nonexistent");
    });
  });

  describe("delete", () => {
    it("removes the problem folder", async () => {
      await repo.create(sampleProblemInput);

      await repo.delete("two-sum");

      const problem = await repo.getById("two-sum");
      expect(problem).toBeNull();
    });

    it("does not throw for non-existent problem", async () => {
      await expect(repo.delete("nonexistent")).resolves.toBeUndefined();
    });
  });

  describe("getNotes and saveNotes", () => {
    it("returns empty string for new problem", async () => {
      await repo.create(sampleProblemInput);
      const notes = await repo.getNotes("two-sum");
      expect(notes).toBe("");
    });

    it("saves and reads notes", async () => {
      await repo.create(sampleProblemInput);
      await repo.saveNotes("two-sum", "# Approach\n\nUse a hash map.");
      const notes = await repo.getNotes("two-sum");
      expect(notes).toBe("# Approach\n\nUse a hash map.");
    });

    it("returns empty string for non-existent problem", async () => {
      const notes = await repo.getNotes("nonexistent");
      expect(notes).toBe("");
    });

    it("throws on saveNotes for non-existent problem", async () => {
      await expect(repo.saveNotes("nonexistent", "content")).rejects.toThrow(
        "Problem not found: nonexistent",
      );
    });
  });

  describe("getSolution and saveSolution", () => {
    it("returns empty string for new problem", async () => {
      await repo.create(sampleProblemInput);
      const solution = await repo.getSolution("two-sum");
      expect(solution).toBe("");
    });

    it("saves and reads solution", async () => {
      await repo.create(sampleProblemInput);
      await repo.saveSolution(
        "two-sum",
        "```python\ndef two_sum(nums, target):\n    pass\n```",
      );
      const solution = await repo.getSolution("two-sum");
      expect(solution).toBe(
        "```python\ndef two_sum(nums, target):\n    pass\n```",
      );
    });

    it("returns empty string for non-existent problem", async () => {
      const solution = await repo.getSolution("nonexistent");
      expect(solution).toBe("");
    });

    it("throws on saveSolution for non-existent problem", async () => {
      await expect(repo.saveSolution("nonexistent", "content")).rejects.toThrow(
        "Problem not found: nonexistent",
      );
    });
  });

  describe("getRevision", () => {
    it("returns default revision data when no revision.json exists", async () => {
      await repo.create(sampleProblemInput);
      const revision = await repo.getRevision("two-sum");

      expect(revision.itemId).toBe("two-sum");
      expect(revision.itemType).toBe("problem");
      expect(revision.lastReviewed).toBeNull();
      expect(revision.confidence).toBe(1);
      expect(revision.history).toEqual([]);
    });

    it("returns default revision data for non-existent problem", async () => {
      const revision = await repo.getRevision("nonexistent");
      expect(revision.itemId).toBe("nonexistent");
      expect(revision.itemType).toBe("problem");
    });
  });
});
