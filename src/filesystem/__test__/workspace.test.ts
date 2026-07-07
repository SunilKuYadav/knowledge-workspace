import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "path";
import { mkdtemp, rm, writeFile, mkdir } from "fs/promises";
import { tmpdir } from "os";
import {
  ensureDirectoryExists,
  listDirectories,
  readJsonFile,
  writeJsonFile,
  readMarkdownFile,
  writeMarkdownFile,
  getWorkspacePath,
} from "./workspace";

describe("workspace filesystem utilities", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "workspace-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("getWorkspacePath", () => {
    it("returns a string path", () => {
      const result = getWorkspacePath();
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("ensureDirectoryExists", () => {
    it("creates a new directory", async () => {
      const dirPath = path.join(tempDir, "new-dir");
      await ensureDirectoryExists(dirPath);
      const dirs = await listDirectories(tempDir);
      expect(dirs).toContain("new-dir");
    });

    it("creates nested directories recursively", async () => {
      const dirPath = path.join(tempDir, "a", "b", "c");
      await ensureDirectoryExists(dirPath);
      const dirs = await listDirectories(path.join(tempDir, "a", "b"));
      expect(dirs).toContain("c");
    });

    it("does not throw if directory already exists", async () => {
      const dirPath = path.join(tempDir, "existing");
      await mkdir(dirPath);
      await expect(ensureDirectoryExists(dirPath)).resolves.toBeUndefined();
    });
  });

  describe("listDirectories", () => {
    it("lists only subdirectories, not files", async () => {
      await mkdir(path.join(tempDir, "dir1"));
      await mkdir(path.join(tempDir, "dir2"));
      await writeFile(path.join(tempDir, "file.txt"), "hello");

      const dirs = await listDirectories(tempDir);
      expect(dirs).toContain("dir1");
      expect(dirs).toContain("dir2");
      expect(dirs).not.toContain("file.txt");
    });

    it("returns empty array for non-existent path", async () => {
      const result = await listDirectories(path.join(tempDir, "nonexistent"));
      expect(result).toEqual([]);
    });
  });

  describe("readJsonFile", () => {
    it("reads and parses a JSON file", async () => {
      const filePath = path.join(tempDir, "data.json");
      await writeFile(filePath, JSON.stringify({ name: "test", value: 42 }));

      const result = await readJsonFile<{ name: string; value: number }>(
        filePath,
      );
      expect(result).toEqual({ name: "test", value: 42 });
    });

    it("returns null for non-existent file", async () => {
      const result = await readJsonFile(path.join(tempDir, "missing.json"));
      expect(result).toBeNull();
    });

    it("throws FilesystemError for permission denied", async () => {
      const filePath = path.join(tempDir, "noperm.json");
      await writeFile(filePath, "{}", { mode: 0o000 });

      try {
        await readJsonFile(filePath);
        expect.fail("Should have thrown");
      } catch (error: unknown) {
        const fsErr = error as { code: string; path: string };
        expect(fsErr.code).toBe("PERMISSION_DENIED");
        expect(fsErr.path).toBe(filePath);
      }
    });
  });

  describe("writeJsonFile", () => {
    it("writes data as formatted JSON", async () => {
      const filePath = path.join(tempDir, "output.json");
      await writeJsonFile(filePath, { key: "value" });

      const result = await readJsonFile<{ key: string }>(filePath);
      expect(result).toEqual({ key: "value" });
    });

    it("creates parent directories if they do not exist", async () => {
      const filePath = path.join(tempDir, "nested", "dir", "output.json");
      await writeJsonFile(filePath, { nested: true });

      const result = await readJsonFile<{ nested: boolean }>(filePath);
      expect(result).toEqual({ nested: true });
    });
  });

  describe("readMarkdownFile", () => {
    it("reads a Markdown file content", async () => {
      const filePath = path.join(tempDir, "readme.md");
      await writeFile(filePath, "# Hello\n\nWorld");

      const result = await readMarkdownFile(filePath);
      expect(result).toBe("# Hello\n\nWorld");
    });

    it("returns empty string for non-existent file", async () => {
      const result = await readMarkdownFile(path.join(tempDir, "missing.md"));
      expect(result).toBe("");
    });
  });

  describe("writeMarkdownFile", () => {
    it("writes content to a Markdown file", async () => {
      const filePath = path.join(tempDir, "notes.md");
      await writeMarkdownFile(filePath, "# Notes\n\nSome content");

      const result = await readMarkdownFile(filePath);
      expect(result).toBe("# Notes\n\nSome content");
    });

    it("creates parent directories if they do not exist", async () => {
      const filePath = path.join(tempDir, "deep", "path", "notes.md");
      await writeMarkdownFile(filePath, "# Deep Notes");

      const result = await readMarkdownFile(filePath);
      expect(result).toBe("# Deep Notes");
    });
  });
});
