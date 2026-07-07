import { describe, it, expect } from "vitest";
import { generateCommitMessage } from "./commit";

describe("generateCommitMessage", () => {
  it("generates a create message with item title", () => {
    const msg = generateCommitMessage(
      "create",
      "notes for topic",
      "Binary Trees",
    );
    expect(msg).toBe("Create notes for topic: Binary Trees");
  });

  it("generates an update message with item title", () => {
    const msg = generateCommitMessage(
      "update",
      "solution for problem",
      "Two Sum",
    );
    expect(msg).toBe("Update solution for problem: Two Sum");
  });

  it("generates a delete message with item title", () => {
    const msg = generateCommitMessage("delete", "topic", "Sorting Algorithms");
    expect(msg).toBe("Delete topic: Sorting Algorithms");
  });

  it("generates a fallback message when no item title is provided", () => {
    const msg = generateCommitMessage("update", "path/to/file.md");
    expect(msg).toBe("Update: path/to/file.md");
  });

  it("generates a fallback message for create without title", () => {
    const msg = generateCommitMessage(
      "create",
      "notes/dsa/binary-trees/notes.md",
    );
    expect(msg).toBe("Create: notes/dsa/binary-trees/notes.md");
  });
});
