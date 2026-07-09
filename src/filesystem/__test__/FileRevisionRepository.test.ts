import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "path";
import { mkdtemp, rm, mkdir, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { FileRevisionRepository } from "./FileRevisionRepository";
import type { RevisionData, RevisionEntry } from "@/types";

describe("FileRevisionRepository", () => {
  let tempDir: string;
  let repo: FileRevisionRepository;

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "revision-repo-test-"));
    repo = new FileRevisionRepository(tempDir);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  /**
   * Helper to create a topic folder with topic.json and optional revision.json.
   */
  async function createTopicWithRevision(
    category: string,
    slug: string,
    revision?: RevisionData,
  ): Promise<void> {
    const topicDir = path.join(tempDir, "notes", category, slug);
    await mkdir(topicDir, { recursive: true });
    await writeFile(
      path.join(topicDir, "topic.json"),
      JSON.stringify({ id: slug, title: slug, category }),
      "utf-8",
    );
    if (revision) {
      await writeFile(
        path.join(topicDir, "revision.json"),
        JSON.stringify(revision),
        "utf-8",
      );
    }
  }

  /**
   * Helper to create a problem folder with problem.json and optional revision.json.
   */
  async function createProblemWithRevision(
    slug: string,
    revision?: RevisionData,
  ): Promise<void> {
    const problemDir = path.join(tempDir, "problems", slug);
    await mkdir(problemDir, { recursive: true });
    await writeFile(
      path.join(problemDir, "problem.json"),
      JSON.stringify({ id: slug, title: slug }),
      "utf-8",
    );
    if (revision) {
      await writeFile(
        path.join(problemDir, "revision.json"),
        JSON.stringify(revision),
        "utf-8",
      );
    }
  }

  function makeRevisionData(
    itemId: string,
    itemType: "topic" | "problem",
    nextReview: string,
    overrides?: Partial<RevisionData>,
  ): RevisionData {
    return {
      itemId,
      itemType,
      lastReviewed: "2024-01-10",
      nextReview,
      confidence: 3,
      history: [],
      ...overrides,
    };
  }

  describe("getDueItems", () => {
    it("returns empty array when no revision files exist", async () => {
      const items = await repo.getDueItems("2024-01-20");
      expect(items).toEqual([]);
    });

    it("returns items that are overdue", async () => {
      const revision = makeRevisionData("binary-trees", "topic", "2024-01-15");
      await createTopicWithRevision("dsa", "binary-trees", revision);

      const items = await repo.getDueItems("2024-01-20");
      expect(items).toHaveLength(1);
      expect(items[0].itemId).toBe("binary-trees");
    });

    it("returns items that are due today", async () => {
      const revision = makeRevisionData("two-sum", "problem", "2024-01-20");
      await createProblemWithRevision("two-sum", revision);

      const items = await repo.getDueItems("2024-01-20");
      expect(items).toHaveLength(1);
      expect(items[0].itemId).toBe("two-sum");
    });

    it("does not return upcoming items", async () => {
      const revision = makeRevisionData("graphs", "topic", "2024-01-25");
      await createTopicWithRevision("dsa", "graphs", revision);

      const items = await repo.getDueItems("2024-01-20");
      expect(items).toHaveLength(0);
    });

    it("scans across multiple categories and flat problems", async () => {
      await createTopicWithRevision(
        "dsa",
        "arrays",
        makeRevisionData("arrays", "topic", "2024-01-18"),
      );
      await createTopicWithRevision(
        "system-design",
        "load-balancing",
        makeRevisionData("load-balancing", "topic", "2024-01-19"),
      );
      await createProblemWithRevision(
        "two-sum",
        makeRevisionData("two-sum", "problem", "2024-01-20"),
      );
      // This one is upcoming — should not be included
      await createProblemWithRevision(
        "div2-problem",
        makeRevisionData("div2-problem", "problem", "2024-01-25"),
      );

      const items = await repo.getDueItems("2024-01-20");
      expect(items).toHaveLength(3);
    });

    it("skips topic folders without revision.json", async () => {
      await createTopicWithRevision("dsa", "no-revision-topic");

      const items = await repo.getDueItems("2024-01-20");
      expect(items).toHaveLength(0);
    });
  });

  describe("updateRevision", () => {
    it("creates revision data if none exists and adds entry", async () => {
      await createTopicWithRevision("dsa", "binary-trees");

      const entry: RevisionEntry = {
        id: "rev-001",
        date: "2024-01-20",
        confidence: 4,
        notes: "Good understanding",
      };

      const result = await repo.updateRevision("binary-trees", "topic", entry);

      expect(result.itemId).toBe("binary-trees");
      expect(result.itemType).toBe("topic");
      expect(result.lastReviewed).toBe("2024-01-20");
      expect(result.confidence).toBe(4);
      expect(result.history).toHaveLength(1);
      expect(result.history[0].id).toBe("rev-001");
      expect(result.nextReview).toBeDefined();
      // nextReview should be after the review date
      expect(result.nextReview > "2024-01-20").toBe(true);
    });

    it("appends to existing revision history", async () => {
      const existing = makeRevisionData("binary-trees", "topic", "2024-01-20", {
        history: [{ id: "rev-001", date: "2024-01-10", confidence: 2 }],
      });
      await createTopicWithRevision("dsa", "binary-trees", existing);

      const entry: RevisionEntry = {
        id: "rev-002",
        date: "2024-01-20",
        confidence: 4,
      };

      const result = await repo.updateRevision("binary-trees", "topic", entry);

      expect(result.history).toHaveLength(2);
      expect(result.history[1].id).toBe("rev-002");
      expect(result.confidence).toBe(4);
    });

    it("works with problem items", async () => {
      await createProblemWithRevision("two-sum");

      const entry: RevisionEntry = {
        id: "rev-001",
        date: "2024-01-20",
        confidence: 5,
      };

      const result = await repo.updateRevision("two-sum", "problem", entry);

      expect(result.itemId).toBe("two-sum");
      expect(result.itemType).toBe("problem");
      expect(result.confidence).toBe(5);
      expect(result.history).toHaveLength(1);
    });

    it("throws for non-existent item", async () => {
      const entry: RevisionEntry = {
        id: "rev-001",
        date: "2024-01-20",
        confidence: 3,
      };

      await expect(
        repo.updateRevision("nonexistent", "topic", entry),
      ).rejects.toThrow("Item not found: nonexistent");
    });

    it("persists updated data to disk", async () => {
      await createTopicWithRevision("dsa", "binary-trees");

      const entry: RevisionEntry = {
        id: "rev-001",
        date: "2024-01-20",
        confidence: 4,
      };

      await repo.updateRevision("binary-trees", "topic", entry);

      // Create a new repo instance to read from disk
      const freshRepo = new FileRevisionRepository(tempDir);
      const history = await freshRepo.getHistory("binary-trees");
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe("rev-001");
    });
  });

  describe("getHistory", () => {
    it("returns empty array when no revision.json exists", async () => {
      await createTopicWithRevision("dsa", "binary-trees");

      const history = await repo.getHistory("binary-trees");
      expect(history).toEqual([]);
    });

    it("returns history from topic revision.json", async () => {
      const revision = makeRevisionData("binary-trees", "topic", "2024-01-25", {
        history: [
          { id: "rev-001", date: "2024-01-10", confidence: 2 },
          { id: "rev-002", date: "2024-01-20", confidence: 4 },
        ],
      });
      await createTopicWithRevision("dsa", "binary-trees", revision);

      const history = await repo.getHistory("binary-trees");
      expect(history).toHaveLength(2);
      expect(history[0].id).toBe("rev-001");
      expect(history[1].id).toBe("rev-002");
    });

    it("returns history from problem revision.json", async () => {
      const revision = makeRevisionData("two-sum", "problem", "2024-01-25", {
        history: [{ id: "rev-001", date: "2024-01-15", confidence: 3 }],
      });
      await createProblemWithRevision("two-sum", revision);

      const history = await repo.getHistory("two-sum");
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe("rev-001");
    });

    it("returns empty array for non-existent item", async () => {
      const history = await repo.getHistory("nonexistent");
      expect(history).toEqual([]);
    });
  });
});
