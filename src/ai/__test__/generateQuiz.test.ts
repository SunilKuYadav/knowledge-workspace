import { describe, it, expect } from "vitest";
import { generateQuiz } from "../generateQuiz";
import type { AIClient } from "../client";

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
    getLastUsage() {
      return null;
    },
  };
}

describe("generateQuiz", () => {
  it("returns empty array when client is unavailable", async () => {
    const client = createMockClient([], false);
    const result = await generateQuiz("some content", client);
    expect(result).toEqual([]);
  });

  it("parses valid quiz JSON response", async () => {
    const quizData = [
      {
        question: "What is O(1)?",
        options: [
          "Constant time",
          "Linear time",
          "Quadratic time",
          "Logarithmic time",
        ],
        correctIndex: 0,
        explanation: "O(1) means constant time regardless of input size.",
      },
    ];

    const client = createMockClient([JSON.stringify(quizData)]);
    const result = await generateQuiz("algorithms content", client);

    expect(result).toHaveLength(1);
    expect(result[0].question).toBe("What is O(1)?");
    expect(result[0].correctIndex).toBe(0);
    expect(result[0].options).toHaveLength(4);
  });

  it("parses quiz JSON from markdown code block", async () => {
    const quizData = [
      {
        question: "Test?",
        options: ["A", "B", "C", "D"],
        correctIndex: 1,
        explanation: "B is correct.",
      },
    ];

    const client = createMockClient([
      "```json\n",
      JSON.stringify(quizData),
      "\n```",
    ]);
    const result = await generateQuiz("content", client);

    expect(result).toHaveLength(1);
    expect(result[0].correctIndex).toBe(1);
  });

  it("returns empty array for invalid JSON response", async () => {
    const client = createMockClient(["This is not JSON at all, just text."]);
    const result = await generateQuiz("content", client);
    expect(result).toEqual([]);
  });

  it("filters out invalid quiz items with missing fields", async () => {
    const data = [
      {
        question: "Valid?",
        options: ["A", "B"],
        correctIndex: 0,
        explanation: "Yes",
      },
      { question: "Missing options" },
      { options: ["A"], correctIndex: 0, explanation: "No question" },
    ];

    const client = createMockClient([JSON.stringify(data)]);
    const result = await generateQuiz("content", client);

    expect(result).toHaveLength(1);
    expect(result[0].question).toBe("Valid?");
  });

  it("filters out quiz items with out-of-bounds correctIndex", async () => {
    const data = [
      {
        question: "Bad index?",
        options: ["A", "B"],
        correctIndex: 5,
        explanation: "Oops",
      },
    ];

    const client = createMockClient([JSON.stringify(data)]);
    const result = await generateQuiz("content", client);

    expect(result).toEqual([]);
  });

  it("returns empty array when generate throws", async () => {
    const client: AIClient = {
      async isAvailable() {
        return true;
      },
      async *generate() {
        throw new Error("Stream failed");
      },
      getLastUsage() {
        return null;
      },
    };

    const result = await generateQuiz("content", client);
    expect(result).toEqual([]);
  });
});
