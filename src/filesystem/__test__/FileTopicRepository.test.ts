import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "path";
import { mkdtemp, rm, readFile } from "fs/promises";
import { tmpdir } from "os";
import { FileTopicRepository } from "../FileTopicRepository";
import type { Topic } from "@/types";

describe("FileTopicRepository", () => {
  let tempDir: string;
  let repo: FileTopicRepository;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "topic-repo-test-"));
    repo = new FileTopicRepository(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  const sampleTopicInput = {
    title: "Binary Trees",
    category: "dsa" as const,
    difficulty: "medium" as const,
    status: "in-progress" as const,
    confidence: 3 as const,
    tags: ["trees", "recursion", "dfs", "bfs"],
  };

  describe("create", () => {
    it("creates topic folder with topic.json and overview.md", async () => {
      const topic = await repo.create(sampleTopicInput);

      expect(topic.id).toBe("binary-trees");
      expect(topic.title).toBe("Binary Trees");
      expect(topic.category).toBe("dsa");
      expect(topic.createdAt).toBeDefined();
      expect(topic.updatedAt).toBeDefined();
      // New fields default correctly
      expect(topic.prerequisites).toEqual([]);
      expect(topic.relatedTopics).toEqual([]);
      expect(topic.slug).toBe("binary-trees");

      // Verify required files exist
      const folderPath = path.join(tempDir, "notes", "dsa", "binary-trees");
      const topicJson = JSON.parse(
        await readFile(path.join(folderPath, "topic.json"), "utf-8"),
      );
      expect(topicJson.id).toBe("binary-trees");

      // Only overview.md is created by default — all other artifacts are on-demand
      const overview = await readFile(
        path.join(folderPath, "overview.md"),
        "utf-8",
      );
      expect(overview).toContain("# Binary Trees");
    });

    it("generates slug from title correctly", async () => {
      const topic = await repo.create({
        ...sampleTopicInput,
        title: "Depth First Search",
      });
      expect(topic.id).toBe("depth-first-search");
    });

    it("handles special characters in title", async () => {
      const topic = await repo.create({
        ...sampleTopicInput,
        title: "B+ Trees & Indexing",
      });
      expect(topic.id).toBe("b-trees-indexing");
    });

    it("places topic in correct category subdirectory", async () => {
      await repo.create({
        ...sampleTopicInput,
        title: "CAP Theorem",
        category: "database",
      });

      const folderPath = path.join(tempDir, "notes", "database", "cap-theorem");
      const topicJson = JSON.parse(
        await readFile(path.join(folderPath, "topic.json"), "utf-8"),
      );
      expect(topicJson.category).toBe("database");
    });
  });

  describe("getAll", () => {
    it("returns empty array when no topics exist", async () => {
      const topics = await repo.getAll();
      expect(topics).toEqual([]);
    });

    it("returns all topics across categories", async () => {
      await repo.create(sampleTopicInput);
      await repo.create({
        ...sampleTopicInput,
        title: "Load Balancing",
        category: "system-design",
      });
      await repo.create({
        ...sampleTopicInput,
        title: "TCP/IP",
        category: "networking",
      });

      const topics = await repo.getAll();
      expect(topics).toHaveLength(3);
      expect(topics.map((t) => t.category)).toContain("dsa");
      expect(topics.map((t) => t.category)).toContain("system-design");
      expect(topics.map((t) => t.category)).toContain("networking");
    });
  });

  describe("getById", () => {
    it("returns topic by slug id", async () => {
      await repo.create(sampleTopicInput);

      const topic = await repo.getById("binary-trees");
      expect(topic).not.toBeNull();
      expect(topic!.title).toBe("Binary Trees");
    });

    it("returns null for non-existent topic", async () => {
      const topic = await repo.getById("nonexistent");
      expect(topic).toBeNull();
    });

    it("finds topic regardless of category", async () => {
      await repo.create({
        ...sampleTopicInput,
        title: "REST APIs",
        category: "networking",
      });

      const topic = await repo.getById("rest-apis");
      expect(topic).not.toBeNull();
      expect(topic!.category).toBe("networking");
    });
  });

  describe("update", () => {
    it("merges partial data with existing topic", async () => {
      await repo.create(sampleTopicInput);

      const updated = await repo.update("binary-trees", {
        status: "completed",
        confidence: 5,
      });

      expect(updated.status).toBe("completed");
      expect(updated.confidence).toBe(5);
      expect(updated.title).toBe("Binary Trees");
      expect(updated.id).toBe("binary-trees");
    });

    it("updates the updatedAt timestamp", async () => {
      const created = await repo.create(sampleTopicInput);

      await new Promise((r) => setTimeout(r, 10));

      const updated = await repo.update("binary-trees", {
        status: "completed",
      });
      expect(updated.updatedAt).not.toBe(created.createdAt);
    });

    it("preserves id and createdAt on update", async () => {
      const created = await repo.create(sampleTopicInput);

      const updated = await repo.update("binary-trees", {
        id: "hacked-id",
        createdAt: "2000-01-01T00:00:00Z",
      } as Partial<Topic>);

      expect(updated.id).toBe("binary-trees");
      expect(updated.createdAt).toBe(created.createdAt);
    });

    it("throws for non-existent topic", async () => {
      await expect(
        repo.update("nonexistent", { status: "completed" }),
      ).rejects.toThrow("Topic not found: nonexistent");
    });
  });

  describe("delete", () => {
    it("removes the topic folder", async () => {
      await repo.create(sampleTopicInput);

      await repo.delete("binary-trees");

      const topic = await repo.getById("binary-trees");
      expect(topic).toBeNull();
    });

    it("throws for non-existent topic", async () => {
      await expect(repo.delete("nonexistent")).rejects.toThrow(
        "Topic not found: nonexistent",
      );
    });
  });

  describe("getContent and saveContent", () => {
    it("returns template content for newly created topic", async () => {
      await repo.create(sampleTopicInput);
      const overview = await repo.getContent("binary-trees", "overview");
      expect(overview).toContain("# Binary Trees");
    });

    it("saves and reads content", async () => {
      await repo.create(sampleTopicInput);
      await repo.saveContent(
        "binary-trees",
        "notes",
        "# Updated Notes\n\nSome content.",
      );
      const notes = await repo.getContent("binary-trees", "notes");
      expect(notes).toBe("# Updated Notes\n\nSome content.");
    });

    it("returns empty string for non-existent topic", async () => {
      const content = await repo.getContent("nonexistent", "overview");
      expect(content).toBe("");
    });

    it("throws on saveContent for non-existent topic", async () => {
      await expect(
        repo.saveContent("nonexistent", "notes", "content"),
      ).rejects.toThrow("Topic not found: nonexistent");
    });
  });

  describe("getFlashcards", () => {
    it("returns empty deck when no flashcards.json exists", async () => {
      await repo.create(sampleTopicInput);
      const deck = await repo.getFlashcards("binary-trees");

      expect(deck.topicId).toBe("binary-trees");
      expect(deck.cards).toEqual([]);
    });

    it("returns empty deck for non-existent topic", async () => {
      const deck = await repo.getFlashcards("nonexistent");
      expect(deck.topicId).toBe("nonexistent");
      expect(deck.cards).toEqual([]);
    });
  });

  describe("getRevision", () => {
    it("returns default revision data when no revision.json exists", async () => {
      await repo.create(sampleTopicInput);
      const revision = await repo.getRevision("binary-trees");

      expect(revision.itemId).toBe("binary-trees");
      expect(revision.itemType).toBe("topic");
      expect(revision.lastReviewed).toBeNull();
      expect(revision.confidence).toBe(1);
      expect(revision.history).toEqual([]);
    });

    it("returns default revision data for non-existent topic", async () => {
      const revision = await repo.getRevision("nonexistent");
      expect(revision.itemId).toBe("nonexistent");
      expect(revision.itemType).toBe("topic");
    });
  });
});
