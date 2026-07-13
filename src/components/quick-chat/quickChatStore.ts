"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { QuickChatTab, QuickChatMessage, QuickChatData } from "./types";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface QuickChatState extends QuickChatData {
  /** Whether the chat panel is open */
  isOpen: boolean;

  // Panel actions
  toggle: () => void;
  open: () => void;
  close: () => void;

  // Tab actions
  createTab: (title?: string) => QuickChatTab;
  setActiveTab: (tabId: string) => void;
  renameTab: (tabId: string, title: string) => void;
  deleteTab: (tabId: string) => void;

  // Message actions
  addMessage: (tabId: string, role: "user" | "assistant", content: string) => void;
  updateLastAssistantMessage: (tabId: string, content: string) => void;

  // Summary
  updateSummary: (tabId: string, summary: string) => void;

  // Tab data loading
  setTabMessages: (tabId: string, messages: QuickChatMessage[]) => void;

  // Getters
  getActiveTab: () => QuickChatTab | null;
  getVisibleTabs: () => QuickChatTab[];
}

export const useQuickChatStore = create<QuickChatState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,
      isOpen: false,

      toggle() {
        set((s) => ({ isOpen: !s.isOpen }));
      },

      open() {
        const state = get();
        // If no tabs exist, create one
        if (state.getVisibleTabs().length === 0) {
          const tab = state.createTab();
          set({ isOpen: true, activeTabId: tab.id });
        } else {
          set({ isOpen: true });
        }
      },

      close() {
        set({ isOpen: false });
      },

      createTab(title?: string) {
        const newTab: QuickChatTab = {
          id: generateId(),
          title: title || `Chat ${get().tabs.filter((t) => !t.deleted).length + 1}`,
          messages: [],
          summary: "",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          deleted: false,
          messagesLoaded: true,
        };

        set((s) => ({
          tabs: [...s.tabs, newTab],
          activeTabId: newTab.id,
        }));

        return newTab;
      },

      setActiveTab(tabId: string) {
        set({ activeTabId: tabId });
      },

      renameTab(tabId: string, title: string) {
        set((s) => ({
          tabs: s.tabs.map((t) =>
            t.id === tabId ? { ...t, title, updatedAt: Date.now() } : t,
          ),
        }));
      },

      deleteTab(tabId: string) {
        set((s) => {
          const updatedTabs = s.tabs.map((t) =>
            t.id === tabId ? { ...t, deleted: true, updatedAt: Date.now() } : t,
          );
          const visibleTabs = updatedTabs.filter((t) => !t.deleted);
          const newActiveId =
            s.activeTabId === tabId
              ? visibleTabs[visibleTabs.length - 1]?.id ?? null
              : s.activeTabId;
          return { tabs: updatedTabs, activeTabId: newActiveId };
        });
      },

      addMessage(tabId: string, role: "user" | "assistant", content: string) {
        const msg: QuickChatMessage = {
          id: generateId(),
          role,
          content,
          timestamp: Date.now(),
        };

        set((s) => ({
          tabs: s.tabs.map((t) =>
            t.id === tabId
              ? { ...t, messages: [...t.messages, msg], updatedAt: Date.now() }
              : t,
          ),
        }));
      },

      updateLastAssistantMessage(tabId: string, content: string) {
        set((s) => ({
          tabs: s.tabs.map((t) => {
            if (t.id !== tabId) return t;
            const messages = [...t.messages];
            const lastIdx = messages.length - 1;
            if (lastIdx >= 0 && messages[lastIdx].role === "assistant") {
              messages[lastIdx] = { ...messages[lastIdx], content };
            }
            return { ...t, messages, updatedAt: Date.now() };
          }),
        }));
      },

      updateSummary(tabId: string, summary: string) {
        set((s) => ({
          tabs: s.tabs.map((t) =>
            t.id === tabId ? { ...t, summary, updatedAt: Date.now() } : t,
          ),
        }));
      },

      setTabMessages(tabId: string, messages: QuickChatMessage[]) {
        set((s) => ({
          tabs: s.tabs.map((t) =>
            t.id === tabId ? { ...t, messages, messagesLoaded: true } : t,
          ),
        }));
      },

      getActiveTab() {
        const { tabs, activeTabId } = get();
        if (!activeTabId) return null;
        return tabs.find((t) => t.id === activeTabId && !t.deleted) ?? null;
      },

      getVisibleTabs() {
        return get().tabs.filter((t) => !t.deleted);
      },
    }),
    {
      name: "quick-chat-store",
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
      }),
    },
  ),
);
