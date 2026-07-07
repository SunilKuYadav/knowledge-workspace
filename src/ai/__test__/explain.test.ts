import { describe, it, expect } from "vitest";
import {
  explainConcept,
  suggestSimilarProblems,
  generateInterviewPrep,
} from "./explain";
import type { AIClient } from "./client";
import type { Problem } from "@/types";

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

const mockProblem: Problem = {
  id: "two-sum",
  title: "Two Sum",
  platform: "leetcode",
  difficulty: "easy",
  companies: ["Google", "Amazon"],
  patterns: ["hash-map", "two-pointers"],
  status: "solved",
  favorite: true,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

describe("explainConcept", () => {
  it("yields unavailability message when client is not available", async () => {
    const client = createMockClient([], false);
    const chunks: string[] = [];

    for await (const chunk of explainConcept("concept", "context", client)) {
      chunks.push(chunk);
    }

    expect(chunks.join("")).toContain("AI is currently unavailable");
  });

  it("yields streaming explanation chunks", async () => {
    const client = createMockClient([
      "Hash maps ",
      "provide O(1) ",
      "lookups.",
    ]);
    const chunks: string[] = [];

    for await (const chunk of explainConcept(
      "hash map",
      "data structures",
      client,
    )) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(["Hash maps ", "provide O(1) ", "lookups."]);
  });
});

describe("suggestSimilarProblems", () => {
  it("returns empty array when client is unavailable", async () => {
    const client = createMockClient([], false);
    const result = await suggestSimilarProblems(mockProblem, client);
    expect(result).toEqual([]);
  });

  it("parses valid suggestions JSON response", async () => {
    const suggestions = ["Three Sum", "Four Sum", "Two Sum II"];
    const client = createMockClient([JSON.stringify(suggestions)]);
    const result = await suggestSimilarProblems(mockProblem, client);

    expect(result).toEqual(["Three Sum", "Four Sum", "Two Sum II"]);
  });

  it("returns empty array for invalid JSON", async () => {
    const client = createMockClient(["Not a JSON array"]);
    const result = await suggestSimilarProblems(mockProblem, client);
    expect(result).toEqual([]);
  });

  it("filters out non-string items from response", async () => {
    const client = createMockClient([
      JSON.stringify(["Valid", 123, null, "Also Valid"]),
    ]);
    const result = await suggestSimilarProblems(mockProblem, client);
    expect(result).toEqual(["Valid", "Also Valid"]);
  });
});

describe("generateInterviewPrep", () => {
  it("yields unavailability message when client is not available", async () => {
    const client = createMockClient([], false);
    const chunks: string[] = [];

    for await (const chunk of generateInterviewPrep(mockProblem, client)) {
      chunks.push(chunk);
    }

    expect(chunks.join("")).toContain("AI is currently unavailable");
  });

  it("yields streaming interview prep chunks", async () => {
    const client = createMockClient([
      "## Key Questions\n",
      "1. Brute force approach?",
    ]);
    const chunks: string[] = [];

    for await (const chunk of generateInterviewPrep(mockProblem, client)) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(["## Key Questions\n", "1. Brute force approach?"]);
  });
});
