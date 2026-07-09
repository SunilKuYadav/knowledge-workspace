import { describe, it, expect, beforeEach } from "vitest";
import { SearchIndex, SearchDocument } from "./search-index";
import { search, SearchOptions } from "./query";
import { buildSearchDocuments, TopicContent, ProblemContent } from "./builder";
import { Topic } from "@/types/Topic";
import { Problem } from "@/types/Problem";
import { Flashcard } from "@/types/Flashcard";

function createDoc(overrides: Partial<SearchDocument> = {}): SearchDocument {
  return {
    id: "doc-1",
    type: "topic",
    title: "Binary Trees",
    content: "Binary trees are hierarchical data structures with nodes",
    tags: ["trees", "dsa"],
    path: "notes/dsa/binary-trees",
    ...overrides,
  };
}

describe("SearchIndex", () => {
  let index: SearchIndex;

  beforeEach(() => {
    index = new SearchIndex();
  });

  it("should build index from documents", () => {
    const docs = [
      createDoc({ id: "doc-1", title: "Binary Trees" }),
      createDoc({
        id: "doc-2",
        title: "Hash Maps",
        content: "Hash maps provide O(1) lookup",
      }),
    ];

    index.buildIndex(docs);

    const results = search(index, { query: "binary" });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("doc-1");
  });

  it("should add a single document", () => {
    index.buildIndex([]);
    index.addDocument(createDoc({ id: "new-doc", title: "Graph Algorithms" }));

    const results = search(index, { query: "graph" });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("new-doc");
  });

  it("should update a document", () => {
    const doc = createDoc({
      id: "doc-1",
      title: "Original Title",
      content: "original content about arrays",
    });
    index.buildIndex([doc]);

    index.updateDocument({
      ...doc,
      title: "Updated Title",
      content: "updated content about linked lists",
    });

    const oldResults = search(index, { query: "arrays" });
    expect(oldResults).toHaveLength(0);

    const newResults = search(index, { query: "linked lists" });
    expect(newResults).toHaveLength(1);
    expect(newResults[0].title).toBe("Updated Title");
  });

  it("should remove a document", () => {
    const doc = createDoc({ id: "doc-1", title: "Removable" });
    index.buildIndex([doc]);

    index.removeDocument("doc-1");

    const results = search(index, { query: "removable" });
    expect(results).toHaveLength(0);
  });
});

describe("search()", () => {
  let index: SearchIndex;

  beforeEach(() => {
    index = new SearchIndex();
    index.buildIndex([
      createDoc({
        id: "topic-1",
        type: "topic",
        title: "Binary Trees",
        content: "tree traversal algorithms",
      }),
      createDoc({
        id: "problem-1",
        type: "problem",
        title: "Two Sum",
        content: "find two numbers that add up to target",
      }),
      createDoc({
        id: "flashcard-1",
        type: "flashcard",
        title: "What is DFS?",
        content: "Depth first search traversal",
      }),
    ]);
  });

  it("should return empty array for empty query", () => {
    const results = search(index, { query: "" });
    expect(results).toHaveLength(0);
  });

  it("should return empty array for whitespace query", () => {
    const results = search(index, { query: "   " });
    expect(results).toHaveLength(0);
  });

  it("should filter results by type", () => {
    const results = search(index, { query: "traversal", filter: "topic" });
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.type).toBe("topic");
    }
  });

  it("should respect limit option", () => {
    index.buildIndex(
      Array.from({ length: 30 }, (_, i) =>
        createDoc({
          id: `doc-${i}`,
          title: `Topic ${i}`,
          content: "common search term",
        }),
      ),
    );

    const results = search(index, { query: "common", limit: 5 });
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it("should default limit to 20", () => {
    index.buildIndex(
      Array.from({ length: 30 }, (_, i) =>
        createDoc({
          id: `doc-${i}`,
          title: `Topic ${i}`,
          content: "shared keyword",
        }),
      ),
    );

    const results = search(index, { query: "shared" });
    expect(results.length).toBeLessThanOrEqual(20);
  });

  it("should produce snippets from content", () => {
    const results = search(index, { query: "binary" });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].snippet).toBeTruthy();
    expect(results[0].snippet.length).toBeLessThanOrEqual(154); // 150 + '...'
  });

  it("should search by tags", () => {
    index.buildIndex([
      createDoc({
        id: "tagged",
        title: "Something",
        content: "unrelated",
        tags: ["recursion", "backtracking"],
      }),
    ]);

    const results = search(index, { query: "recursion" });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("tagged");
  });
});

describe("buildSearchDocuments()", () => {
  it("should convert topics to search documents", () => {
    const topic: Topic = {
      id: "binary-trees",
      title: "Binary Trees",
      category: "dsa",
      difficulty: "medium",
      status: "in-progress",
      confidence: 3,
      tags: ["trees", "recursion"],
      createdAt: "2024-01-15T10:00:00Z",
      updatedAt: "2024-01-20T14:30:00Z",
    };
    const topics: TopicContent[] = [
      {
        topic,
        overview: "Overview of binary trees",
        notes: "Notes on traversals",
      },
    ];

    const docs = buildSearchDocuments(topics, [], []);

    expect(docs).toHaveLength(1);
    expect(docs[0]).toEqual({
      id: "binary-trees",
      type: "topic",
      title: "Binary Trees",
      content: "Overview of binary trees Notes on traversals",
      tags: ["trees", "recursion"],
      path: "notes/dsa/binary-trees",
    });
  });

  it("should convert problems to search documents", () => {
    const problem: Problem = {
      id: "two-sum",
      title: "Two Sum",
      difficulty: "easy",
      companies: ["Google", "Amazon"],
      patterns: ["hash-map"],
      status: "solved",
      favorite: true,
      createdAt: "2024-01-10T08:00:00Z",
      updatedAt: "2024-01-18T16:00:00Z",
    };
    const problems: ProblemContent[] = [
      { problem, notes: "Use a hash map for O(n) solution" },
    ];

    const docs = buildSearchDocuments([], problems, []);

    expect(docs).toHaveLength(1);
    expect(docs[0]).toEqual({
      id: "two-sum",
      type: "problem",
      title: "Two Sum",
      content: "Use a hash map for O(n) solution",
      tags: ["hash-map", "Google", "Amazon"],
      path: "problems/two-sum",
    });
  });

  it("should convert flashcards to search documents", () => {
    const flashcard: Flashcard = {
      id: "fc-001",
      front: "What is the time complexity of BST search?",
      back: "O(log n) average, O(n) worst case",
      tags: ["bst", "complexity"],
      topicId: "binary-trees",
      createdAt: "2024-01-15T10:00:00Z",
    };

    const docs = buildSearchDocuments([], [], [flashcard]);

    expect(docs).toHaveLength(1);
    expect(docs[0]).toEqual({
      id: "fc-001",
      type: "flashcard",
      title: "What is the time complexity of BST search?",
      content: "O(log n) average, O(n) worst case",
      tags: ["bst", "complexity"],
      path: "flashcards/binary-trees",
    });
  });

  it("should combine all document types", () => {
    const topic: Topic = {
      id: "graphs",
      title: "Graphs",
      category: "dsa",
      difficulty: "hard",
      status: "not-started",
      confidence: 1,
      tags: ["graphs"],
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };
    const problem: Problem = {
      id: "bfs",
      title: "BFS Problem",
      difficulty: "medium",
      companies: [],
      patterns: ["bfs"],
      status: "attempted",
      favorite: false,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };
    const flashcard: Flashcard = {
      id: "fc-x",
      front: "Front",
      back: "Back",
      tags: [],
      topicId: "graphs",
      createdAt: "2024-01-01T00:00:00Z",
    };

    const docs = buildSearchDocuments(
      [{ topic, overview: "overview", notes: "" }],
      [{ problem, notes: "notes" }],
      [flashcard],
    );

    expect(docs).toHaveLength(3);
    expect(docs.map((d) => d.type)).toEqual(["topic", "problem", "flashcard"]);
  });
});
