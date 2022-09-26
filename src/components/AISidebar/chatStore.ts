'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  /** Context type: topic or problem */
  context: 'topic' | 'problem';
  /** The item (topic/problem) this session is about */
  itemId: string;
  itemTitle: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

interface AIChatState {
  /** All persisted sessions keyed by session id */
  sessions: Record<string, ChatSession>;
  /** Current active session id per item (keyed by `${context}:${itemId}`) */
  activeSessionIds: Record<string, string>;

  // Actions
  getOrCreateSession: (context: 'topic' | 'problem', itemId: string, itemTitle: string) => ChatSession;
  addMessage: (sessionId: string, role: 'user' | 'assistant', content: string) => void;
  updateLastAssistantMessage: (sessionId: string, content: string) => void;
  clearSession: (sessionId: string) => void;
  getSessionSummary: (sessionId: string) => string;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useAIChatStore = create<AIChatState>()(
  persist(
    (set, get) => ({
      sessions: {},
      activeSessionIds: {},

      getOrCreateSession(context, itemId, itemTitle) {
        const key = `${context}:${itemId}`;
        const state = get();
        const existingId = state.activeSessionIds[key];

        if (existingId && state.sessions[existingId]) {
          return state.sessions[existingId];
        }

        // Create a new session
        const newSession: ChatSession = {
          id: generateId(),
          context,
          itemId,
          itemTitle,
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        set((s) => ({
          sessions: { ...s.sessions, [newSession.id]: newSession },
          activeSessionIds: { ...s.activeSessionIds, [key]: newSession.id },
        }));

        return newSession;
      },

      addMessage(sessionId, role, content) {
        const msg: ChatMessage = {
          id: generateId(),
          role,
          content,
          timestamp: Date.now(),
        };

        set((s) => {
          const session = s.sessions[sessionId];
          if (!session) return s;
          return {
            sessions: {
              ...s.sessions,
              [sessionId]: {
                ...session,
                messages: [...session.messages, msg],
                updatedAt: Date.now(),
              },
            },
          };
        });
      },

      updateLastAssistantMessage(sessionId, content) {
        set((s) => {
          const session = s.sessions[sessionId];
          if (!session) return s;
          const messages = [...session.messages];
          const lastIdx = messages.length - 1;
          if (lastIdx >= 0 && messages[lastIdx].role === 'assistant') {
            messages[lastIdx] = { ...messages[lastIdx], content };
          }
          return {
            sessions: {
              ...s.sessions,
              [sessionId]: { ...session, messages, updatedAt: Date.now() },
            },
          };
        });
      },

      clearSession(sessionId) {
        set((s) => {
          const session = s.sessions[sessionId];
          if (!session) return s;
          // Remove the active pointer so a new session will be created next time
          const key = `${session.context}:${session.itemId}`;
          const { [key]: _, ...restActive } = s.activeSessionIds;
          const { [sessionId]: __, ...restSessions } = s.sessions;
          return {
            sessions: restSessions,
            activeSessionIds: restActive,
          };
        });
      },

      getSessionSummary(sessionId) {
        const session = get().sessions[sessionId];
        if (!session || session.messages.length === 0) return '';

        // Build a concise summary of up to the last 6 Q&A pairs
        const messages = session.messages.slice(-12);
        const lines: string[] = [];
        for (const msg of messages) {
          const prefix = msg.role === 'user' ? 'Q' : 'A';
          // Truncate long messages to keep the summary concise
          const text = msg.content.length > 200 ? msg.content.slice(0, 200) + '...' : msg.content;
          lines.push(`${prefix}: ${text}`);
        }
        return lines.join('\n');
      },
    }),
    {
      name: 'ai-chat-sessions',
      // Only persist sessions and activeSessionIds
      partialize: (state) => ({
        sessions: state.sessions,
        activeSessionIds: state.activeSessionIds,
      }),
    }
  )
);
