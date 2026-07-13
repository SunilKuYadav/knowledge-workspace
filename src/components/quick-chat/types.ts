"use client";

export interface QuickChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface QuickChatTab {
  id: string;
  title: string;
  messages: QuickChatMessage[];
  /** AI-generated 10-100 word summary of the conversation so far */
  summary: string;
  createdAt: number;
  updatedAt: number;
  /** Soft-deleted flag — hidden from UI but kept in repository */
  deleted: boolean;
  /** Whether messages have been loaded from the repository (client-side only) */
  messagesLoaded?: boolean;
}

export interface QuickChatData {
  tabs: QuickChatTab[];
  activeTabId: string | null;
}
