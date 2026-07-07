/**
 * AI interaction logger that works in both server (Node.js) and browser environments.
 *
 * Controlled via environment variables:
 * - Server: AI_LOG_ENABLED=true|false (defaults to true)
 * - Browser: NEXT_PUBLIC_AI_LOG_ENABLED=true|false (defaults to true)
 */

const LOG_PREFIX = "[AIClient]";

/**
 * Returns true if logging is enabled (used internally).
 */
function isEnabled(): boolean {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_AI_LOG_ENABLED !== "false";
  }
  return process.env.AI_LOG_ENABLED !== "false";
}

export function logInput(prompt: string, model?: string): void {
  if (!isEnabled()) return;
  const timestamp = new Date().toISOString();

  if (typeof window !== "undefined") {
    // Browser environment — use styled console groups
    console.groupCollapsed(
      `%c${LOG_PREFIX} INPUT %c${model ?? "unknown"}`,
      "color: #2196F3; font-weight: bold",
      "color: #666",
    );
    console.log("%cTimestamp:", "font-weight: bold", timestamp);
    console.log("%cModel:", "font-weight: bold", model ?? "unknown");
    console.log("%cPrompt:", "font-weight: bold", prompt);
    console.groupEnd();
  } else {
    // Server environment
    console.log(
      `${LOG_PREFIX} [INPUT] [${timestamp}] model=${model ?? "unknown"} prompt=${JSON.stringify(prompt)}`,
    );
  }
}

export function logOutput(prompt: string, fullResponse: string): void {
  if (!isEnabled()) return;
  const timestamp = new Date().toISOString();
  const truncatedPrompt =
    prompt.slice(0, 100) + (prompt.length > 100 ? "..." : "");

  if (typeof window !== "undefined") {
    // Browser environment
    console.groupCollapsed(
      `%c${LOG_PREFIX} OUTPUT %c${truncatedPrompt}`,
      "color: #4CAF50; font-weight: bold",
      "color: #666",
    );
    console.log("%cTimestamp:", "font-weight: bold", timestamp);
    console.log("%cPrompt:", "font-weight: bold", prompt);
    console.log("%cResponse:", "font-weight: bold", fullResponse);
    console.log(
      "%cResponse length:",
      "font-weight: bold",
      fullResponse.length,
      "chars",
    );
    console.groupEnd();
  } else {
    // Server environment
    console.log(
      `${LOG_PREFIX} [OUTPUT] [${timestamp}] prompt=${JSON.stringify(truncatedPrompt)} response=${JSON.stringify(fullResponse)}`,
    );
  }
}

export function logError(prompt: string, error: string): void {
  if (!isEnabled()) return;
  const timestamp = new Date().toISOString();

  if (typeof window !== "undefined") {
    console.error(
      `%c${LOG_PREFIX} ERROR`,
      "color: #f44336; font-weight: bold",
      { timestamp, prompt: prompt.slice(0, 100), error },
    );
  } else {
    console.error(
      `${LOG_PREFIX} [ERROR] [${timestamp}] prompt=${JSON.stringify(prompt.slice(0, 100))} error=${error}`,
    );
  }
}

/**
 * Intercepts AI API fetch requests for logging and connects to the server
 * via SSE to stream real-time AI prompt/response logs to the browser console.
 * Call this once at app initialization.
 */
export function installAIFetchLogger(): void {
  if (typeof window === "undefined") return;
  if (!isEnabled()) return;

  const originalFetch = window.fetch;

  // Intercept fetch to log outgoing requests
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    // Skip non-AI calls and the logs endpoint itself
    if (!url.includes("/api/ai") || url.includes("/api/ai/logs")) {
      return originalFetch.call(this, input, init);
    }

    const body = init?.body ? JSON.parse(init.body as string) : {};
    const action = body.action || "unknown";
    const userInput = body.prompt || body.userResponse || body.question || "";

    console.groupCollapsed(
      `%c${LOG_PREFIX} REQUEST %c${action} → ${url}`,
      "color: #2196F3; font-weight: bold",
      "color: #666",
    );
    console.log("%cAction:", "font-weight: bold", action);
    if (userInput) console.log("%cUser input:", "font-weight: bold", userInput);
    console.log("%cFull body:", "font-weight: bold", body);
    console.groupEnd();

    return originalFetch.call(this, input, init);
  };

  // Connect to SSE stream for real-time AI logs
  const evtSource = new EventSource("/api/ai/logs");
  let streamBuffer = "";
  let currentStreamPrompt = "";
  let currentStreamModel = "";

  evtSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.type === "connected") {
        console.log(
          `%c${LOG_PREFIX} Live log stream connected — AI prompts & responses will appear in real-time`,
          "color: #9C27B0; font-weight: bold",
        );
        return;
      }

      if (data.type === "chunk") {
        // Accumulate streaming chunks
        if (currentStreamPrompt !== data.prompt) {
          // New stream started
          if (streamBuffer) {
            // Flush previous stream
            console.groupCollapsed(
              `%c${LOG_PREFIX} STREAM ⬇ %c${currentStreamModel}`,
              "color: #FF9800; font-weight: bold",
              "color: #666",
            );
            console.log(
              "%c⬆ Prompt:",
              "color: #2196F3; font-weight: bold",
              currentStreamPrompt,
            );
            console.log(
              "%c⬇ Response:",
              "color: #4CAF50; font-weight: bold",
              streamBuffer,
            );
            console.groupEnd();
          }
          streamBuffer = "";
          currentStreamPrompt = data.prompt;
          currentStreamModel = data.model;
        }
        streamBuffer += data.chunk;
        return;
      }

      if (data.type === "complete") {
        // Flush any remaining stream buffer (in case chunks came before complete)
        streamBuffer = "";
        currentStreamPrompt = "";

        console.groupCollapsed(
          `%c${LOG_PREFIX} AI ⬆⬇ %c${data.model} %c${data.timestamp}`,
          "color: #FF9800; font-weight: bold",
          "color: #2196F3",
          "color: #999",
        );
        console.log(
          "%c⬆ Prompt sent to model:",
          "color: #2196F3; font-weight: bold",
        );
        console.log(data.prompt);
        console.log("%c⬇ Model response:", "color: #4CAF50; font-weight: bold");
        console.log(data.response);
        console.groupEnd();
      }
    } catch {
      // Ignore parse errors
    }
  };

  evtSource.onerror = () => {
    // SSE will auto-reconnect
  };
}
