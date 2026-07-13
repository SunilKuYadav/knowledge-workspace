/**
 * API route for loading a single tab's full data (including messages).
 *
 * GET /api/ai/quick-chat/persist/{tabId} — Load one tab's messages on demand.
 */

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { getWorkspacePath } from "@/src/lib/constants";
import { readJsonFile, ensureDirectoryExists } from "@/src/filesystem/workspace";

interface QuickChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface QuickChatTab {
  id: string;
  title: string;
  messages: QuickChatMessage[];
  summary: string;
  createdAt: number;
  updatedAt: number;
  deleted: boolean;
}

function getQuickChatDir(): string {
  return path.join(getWorkspacePath(), ".config", "quick-chat");
}

function getTabPath(tabId: string): string {
  return path.join(getQuickChatDir(), `${tabId}.json`);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tabId: string }> },
) {
  try {
    const { tabId } = await params;

    if (!tabId) {
      return NextResponse.json(
        { error: "Missing tab ID" },
        { status: 400 },
      );
    }

    const dir = getQuickChatDir();
    await ensureDirectoryExists(dir);

    const tabData = await readJsonFile<QuickChatTab>(getTabPath(tabId));
    if (!tabData) {
      return NextResponse.json(
        { error: "Tab not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(tabData);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
