/**
 * API route for persisting quick chat data to the workspace filesystem.
 *
 * Storage structure:
 *   ~/knowledge-workspace/.config/quick-chat/
 *     index.json          — { activeTabId, tabs: [{ id, title, summary, createdAt, updatedAt, deleted }] }
 *     {tabId}.json        — { id, title, messages, summary, createdAt, updatedAt, deleted }
 *
 * GET           — Load all tabs (index + messages for each)
 * POST          — Save a single tab (upserts tab file + updates index)
 * DELETE ?id=x  — Soft-delete a tab (marks deleted in index + tab file)
 */

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { getWorkspacePath } from "@/src/lib/constants";
import {
  readJsonFile,
  writeJsonFile,
  ensureDirectoryExists,
} from "@/src/filesystem/workspace";

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

interface QuickChatIndex {
  activeTabId: string | null;
  tabs: Array<{
    id: string;
    title: string;
    summary: string;
    createdAt: number;
    updatedAt: number;
    deleted: boolean;
  }>;
}

function getQuickChatDir(): string {
  return path.join(getWorkspacePath(), ".config", "quick-chat");
}

function getIndexPath(): string {
  return path.join(getQuickChatDir(), "index.json");
}

function getTabPath(tabId: string): string {
  return path.join(getQuickChatDir(), `${tabId}.json`);
}

/**
 * GET — Load the index only (tab metadata without messages).
 * Individual tab messages are loaded on demand via GET /api/chat-persist/{tabId}.
 */
export async function GET() {
  try {
    const dir = getQuickChatDir();
    await ensureDirectoryExists(dir);

    const index = await readJsonFile<QuickChatIndex>(getIndexPath());
    if (!index || !index.tabs || index.tabs.length === 0) {
      return NextResponse.json({ tabs: [], activeTabId: null });
    }

    return NextResponse.json(index);
  } catch {
    return NextResponse.json({ tabs: [], activeTabId: null });
  }
}

/**
 * POST — Save/update a single tab and update the index.
 * Body: { tab: QuickChatTab, activeTabId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tab, activeTabId } = body as {
      tab: QuickChatTab;
      activeTabId?: string | null;
    };

    if (!tab || !tab.id) {
      return NextResponse.json(
        { success: false, error: "Missing tab data" },
        { status: 400 },
      );
    }

    const dir = getQuickChatDir();
    await ensureDirectoryExists(dir);

    // Write the tab file
    await writeJsonFile(getTabPath(tab.id), tab);

    // Update the index
    const index =
      (await readJsonFile<QuickChatIndex>(getIndexPath())) ?? {
        activeTabId: null,
        tabs: [],
      };

    const existingIdx = index.tabs.findIndex((t) => t.id === tab.id);
    const indexEntry = {
      id: tab.id,
      title: tab.title,
      summary: tab.summary,
      createdAt: tab.createdAt,
      updatedAt: tab.updatedAt,
      deleted: tab.deleted,
    };

    if (existingIdx >= 0) {
      index.tabs[existingIdx] = indexEntry;
    } else {
      index.tabs.push(indexEntry);
    }

    if (activeTabId !== undefined) {
      index.activeTabId = activeTabId;
    }

    await writeJsonFile(getIndexPath(), index);

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

/**
 * DELETE ?id=tabId — Soft-delete a tab.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tabId = searchParams.get("id");

    if (!tabId) {
      return NextResponse.json(
        { success: false, error: "Missing tab id" },
        { status: 400 },
      );
    }

    const dir = getQuickChatDir();
    await ensureDirectoryExists(dir);

    // Update tab file
    const tabData = await readJsonFile<QuickChatTab>(getTabPath(tabId));
    if (tabData) {
      tabData.deleted = true;
      tabData.updatedAt = Date.now();
      await writeJsonFile(getTabPath(tabId), tabData);
    }

    // Update index
    const index = await readJsonFile<QuickChatIndex>(getIndexPath());
    if (index) {
      const entry = index.tabs.find((t) => t.id === tabId);
      if (entry) {
        entry.deleted = true;
        entry.updatedAt = Date.now();
      }
      // If deleted tab was active, pick another
      if (index.activeTabId === tabId) {
        const remaining = index.tabs.filter((t) => !t.deleted);
        index.activeTabId = remaining[remaining.length - 1]?.id ?? null;
      }
      await writeJsonFile(getIndexPath(), index);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
