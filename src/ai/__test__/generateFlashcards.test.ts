import { describe, it, expect } from "vitest";
import { generateFlashcards } from "./generateFlashcards";
import type { AIClient } from "./client";

function createMockClient(responses: string[], available = true): AIClient {
  return {
    async isAvailable() {
      return available;
    },
    async *generate() {
      for (const r of responses) {
        yield r;
      }
    },
  };
}

describe("generateFlashcards", () => {
  it("returns empty array when client is unavailable", async () => {
    const client = createMockClient([], false);
    const result = await generateFlashcards("some content", client);
    expect(result).toEqual([]);
  });

  it("parses valid flashcard JSON response", async () => {
    const flashcardData = [
      {
        front: "What is a hash map?",
        back: "A data structure providing O(1) average-case lookups.",
        tags: ["hash-map", "data-structures"],
      },
    ];

    const client = createMockClient([JSON.stringify(flashcardData)]);
    const result = await generateFlashcards("hash map content", client);

    expect(result).toHaveLength(1);
    expect(result[0].front).toBe("What is a hash map?");
    expect(result[0].back).toBe(
      "A data structure providing O(1) average-case lookups.",
    );
    expect(result[0].tags).toEqual(["hash-map", "data-structures"]);
    expect(result[0].id).toBeDefined();
    expect(result[0].topicId).toBe("");
    expect(result[0].createdAt).toBeDefined();
  });

  it("handles flashcards without tags", async () => {
    const data = [{ front: "Q1", back: "A1" }];

    const client = createMockClient([JSON.stringify(data)]);
    const result = await generateFlashcards("content", client);

    expect(result).toHaveLength(1);
    expect(result[0].tags).toEqual([]);
  });

  it("returns empty array for invalid JSON", async () => {
    const client = createMockClient(["Not valid JSON."]);
    const result = await generateFlashcards("content", client);
    expect(result).toEqual([]);
  });

  it("filters out items with missing front or back", async () => {
    const data = [
      { front: "Valid", back: "Card" },
      { front: "Missing back" },
      { back: "Missing front" },
    ];

    const client = createMockClient([JSON.stringify(data)]);
    const result = await generateFlashcards("content", client);

    expect(result).toHaveLength(1);
    expect(result[0].front).toBe("Valid");
  });

  it("returns empty array when generate throws", async () => {
    const client: AIClient = {
      async isAvailable() {
        return true;
      },
      async *generate() {
        throw new Error("fail");
      },
    };

    const result = await generateFlashcards("content", client);
    expect(result).toEqual([]);
  });
});
