/**
 * API route for generating a 10-100 word summary of a quick chat conversation.
 * Uses the "fast" model tier for speed.
 *
 * POST accepts { messages: Array<{ role, content }> }
 * Returns { summary: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { getReadyClient } from "@/ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages } = body as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
    };

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "Missing required field: messages" },
        { status: 400 },
      );
    }

    const client = await getReadyClient("ai/quick-chat/summarize");

    // Build a concise transcript (limit to last 5 messages to keep it small)
    const recentMessages = messages.slice(-5);
    const transcript = recentMessages
      .map((m) => {
        const prefix = m.role === "user" ? "User" : "Assistant";
        const text = m.content.length > 600 ? m.content.slice(0, 600) + "..." : m.content;
        return `${prefix}: ${text}`;
      })
      .join("\n");

    const prompt = [
      "Summarize the following conversation in 10 to 100 words.",
      "Focus on the key topics discussed and any conclusions reached.",
      "Return ONLY the summary text, no additional formatting or explanation.",
      "",
      "Conversation:",
      transcript,
    ].join("\n");

    // Collect the full response (non-streaming for summary)
    let summary = "";
    for await (const chunk of client.generate(prompt)) {
      summary += chunk;
    }

    // Trim and ensure reasonable length
    summary = summary.trim();
    if (summary.length > 500) {
      summary = summary.slice(0, 500);
    }

    return NextResponse.json({ summary });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
