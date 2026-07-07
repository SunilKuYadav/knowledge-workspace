import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createAIClient, createOllamaClient } from "./client";

describe("createAIClient", () => {
  const baseUrl = "https://api.openai.com/v1";
  const apiKey = "sk-test-key";

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("isAvailable", () => {
    it("returns true when /models endpoint responds with 200", async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
      });

      const client = createAIClient({ baseUrl, apiKey });
      const result = await client.isAvailable();

      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        `${baseUrl}/models`,
        expect.objectContaining({
          signal: expect.any(AbortSignal),
          headers: { Authorization: `Bearer ${apiKey}` },
        }),
      );
    });

    it("returns false when server responds with non-200", async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
      });

      const client = createAIClient({ baseUrl, apiKey });
      const result = await client.isAvailable();

      expect(result).toBe(false);
    });

    it("returns false when fetch throws (connection refused)", async () => {
      (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("ECONNREFUSED"),
      );

      const client = createAIClient({ baseUrl, apiKey });
      const result = await client.isAvailable();

      expect(result).toBe(false);
    });

    it("omits Authorization header when no apiKey provided", async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

      const client = createAIClient({ baseUrl });
      await client.isAvailable();

      expect(fetch).toHaveBeenCalledWith(
        `${baseUrl}/models`,
        expect.objectContaining({
          headers: {},
        }),
      );
    });
  });

  describe("generate", () => {
    it("yields content tokens from streaming SSE response", async () => {
      const lines = [
        "data: " +
          JSON.stringify({ choices: [{ delta: { content: "Hello" } }] }) +
          "\n\n",
        "data: " +
          JSON.stringify({ choices: [{ delta: { content: " world" } }] }) +
          "\n\n",
        "data: " +
          JSON.stringify({ choices: [{ delta: { content: "!" } }] }) +
          "\n\n",
        "data: [DONE]\n\n",
      ];

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          for (const line of lines) {
            controller.enqueue(encoder.encode(line));
          }
          controller.close();
        },
      });

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        body: stream,
      });

      const client = createAIClient({ baseUrl, apiKey, defaultModel: "gpt-4" });
      const chunks: string[] = [];

      for await (const chunk of client.generate("test prompt")) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(["Hello", " world", "!"]);
      expect(fetch).toHaveBeenCalledWith(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [{ role: "user", content: "test prompt" }],
          stream: true,
        }),
      });
    });

    it("uses specified model when provided", async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              "data: " +
                JSON.stringify({ choices: [{ delta: { content: "ok" } }] }) +
                "\n\ndata: [DONE]\n\n",
            ),
          );
          controller.close();
        },
      });

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        body: stream,
      });

      const client = createAIClient({ baseUrl, apiKey });
      const chunks: string[] = [];
      for await (const chunk of client.generate("test", "gpt-4o")) {
        chunks.push(chunk);
      }

      expect(fetch).toHaveBeenCalledWith(
        `${baseUrl}/chat/completions`,
        expect.objectContaining({
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [{ role: "user", content: "test" }],
            stream: true,
          }),
        }),
      );
    });

    it("yields nothing when response is not ok", async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        body: null,
      });

      const client = createAIClient({ baseUrl, apiKey });
      const chunks: string[] = [];

      for await (const chunk of client.generate("test")) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([]);
    });

    it("yields nothing when fetch throws", async () => {
      (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Network error"),
      );

      const client = createAIClient({ baseUrl, apiKey });
      const chunks: string[] = [];

      for await (const chunk of client.generate("test")) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual([]);
    });

    it("handles chunked data split across reads", async () => {
      const encoder = new TextEncoder();
      const fullLine =
        "data: " +
        JSON.stringify({ choices: [{ delta: { content: "split" } }] }) +
        "\n\ndata: [DONE]\n\n";
      const part1 = fullLine.slice(0, 15);
      const part2 = fullLine.slice(15);

      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(part1));
          controller.enqueue(encoder.encode(part2));
          controller.close();
        },
      });

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        body: stream,
      });

      const client = createAIClient({ baseUrl, apiKey });
      const chunks: string[] = [];

      for await (const chunk of client.generate("test")) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(["split"]);
    });

    it("skips empty delta content", async () => {
      const lines = [
        "data: " + JSON.stringify({ choices: [{ delta: {} }] }) + "\n\n",
        "data: " +
          JSON.stringify({ choices: [{ delta: { content: "content" } }] }) +
          "\n\n",
        "data: [DONE]\n\n",
      ];

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          for (const line of lines) {
            controller.enqueue(encoder.encode(line));
          }
          controller.close();
        },
      });

      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        body: stream,
      });

      const client = createAIClient({ baseUrl, apiKey });
      const chunks: string[] = [];

      for await (const chunk of client.generate("test")) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(["content"]);
    });
  });
});

describe("createOllamaClient (deprecated compatibility)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("appends /v1 to base URL and creates a valid client", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    const client = createOllamaClient("http://localhost:11434");
    const result = await client.isAvailable();

    expect(result).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:11434/v1/models",
      expect.any(Object),
    );
  });

  it("does not double-append /v1 if already present", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    const client = createOllamaClient("http://localhost:11434/v1");
    await client.isAvailable();

    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:11434/v1/models",
      expect.any(Object),
    );
  });
});
