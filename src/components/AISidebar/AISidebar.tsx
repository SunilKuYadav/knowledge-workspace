'use client';

/**
 * AI Sidebar component with a chat-like interface.
 *
 * Displays contextual actions and a persistent chat history per topic/problem.
 * Streams responses progressively and offers save-to-file on completion.
 * Conversation history is persisted via Zustand so users can continue
 * follow-up questions across page reloads.
 *
 * Requirements: 13.1, 13.2, 13.3, 13.4
 */

import { useRef, useEffect } from 'react';
import { MarkdownRenderer } from '../MarkdownRenderer';
import type { AISidebarProps } from './types';
import { useAISidebar } from './useAISidebar';

export default function AISidebar({ context, itemId, itemTitle, available: availableProp }: AISidebarProps) {
  const {
    available,
    collapsed,
    loading,
    activeAction,
    saveStatus,
    customPrompt,
    showHelpers,
    width,
    actions,
    promptHelpers,
    messages,
    setCollapsed,
    setCustomPrompt,
    setShowHelpers,
    handleResizeStart,
    handleAction,
    handleSave,
    handleOpenInEditor,
    handleCustomPrompt,
    handleClearChat,
  } = useAISidebar({ context, itemId, itemTitle, available: availableProp });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <aside
      className="h-full border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col shrink-0 relative"
      style={{ width: collapsed ? 48 : width }}
    >
      {/* Resize handle */}
      {!collapsed && (
        <div
          onMouseDown={handleResizeStart}
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/30 active:bg-blue-500/50 transition-colors z-10"
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            AI Chat
          </h2>
          {!collapsed && itemTitle && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5" title={itemTitle}>
              <span className="inline-flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${context === 'problem' ? 'bg-blue-500' : 'bg-green-500'}`} />
                {context === 'problem' ? 'Problem' : 'Topic'}: {itemTitle}
              </span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!collapsed && messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="p-1.5 text-zinc-400 hover:text-red-500 dark:hover:text-red-400 rounded transition-colors"
              aria-label="Clear chat history"
              title="Clear chat"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded transition-colors"
            aria-label={collapsed ? 'Expand AI sidebar' : 'Collapse AI sidebar'}
          >
            {collapsed ? '◀' : '▶'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Chat messages area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* Unavailable message */}
            {!available && (
              <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  AI unavailable — AI service is not running
                </p>
              </div>
            )}

            {/* Action buttons — show when no messages yet */}
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Quick actions:</p>
                <div className="flex flex-wrap gap-1.5">
                  {actions.map((actionConfig) => (
                    <button
                      key={actionConfig.id}
                      onClick={() => handleAction(actionConfig)}
                      disabled={!available || loading}
                      className="px-2.5 py-1.5 text-xs rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {actionConfig.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat messages */}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-md'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-md'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    msg.content ? (
                      <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                        <MarkdownRenderer>{msg.content}</MarkdownRenderer>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    )
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>

          {/* Save buttons — when last message is from assistant and loading is done */}
          {!loading && messages.length > 0 && messages[messages.length - 1]?.role === 'assistant' && activeAction && !activeAction.isGeneral && (
            <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-800 px-3 py-2 flex gap-2">
              <button
                onClick={handleSave}
                disabled={saveStatus === 'saving' || saveStatus === 'saved'}
                className="flex-1 px-2 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saveStatus === 'idle' && 'Save'}
                {saveStatus === 'saving' && 'Saving...'}
                {saveStatus === 'saved' && '✓ Saved'}
                {saveStatus === 'error' && 'Retry'}
              </button>
              <button
                onClick={handleOpenInEditor}
                disabled={saveStatus === 'saving'}
                className="flex-1 px-2 py-1.5 text-xs font-medium rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Open in Editor
              </button>
            </div>
          )}

          {/* Input area — pinned to bottom */}
          <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-800 p-3 space-y-2">
            {/* Quick action chips when there are messages */}
            {messages.length > 0 && (
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowHelpers(!showHelpers)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {showHelpers ? 'Hide suggestions' : '💡 Suggestions'}
                </button>
              </div>
            )}

            {/* Helper prompt suggestions */}
            {showHelpers && (
              <div className="flex flex-wrap gap-1.5">
                {promptHelpers.map((helper) => (
                  <button
                    key={helper.label}
                    type="button"
                    onClick={() => { setCustomPrompt(helper.prompt); setShowHelpers(false); }}
                    disabled={!available || loading}
                    className="px-2 py-1 text-xs rounded-full border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 dark:hover:bg-indigo-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {helper.label}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-1.5 items-end">
              <textarea
                value={customPrompt}
                onChange={(e) => {
                  setCustomPrompt(e.target.value);
                  e.target.style.height = 'auto';
                  const lineHeight = 20;
                  const maxHeight = lineHeight * 3 + 12;
                  e.target.style.height = `${Math.min(e.target.scrollHeight, maxHeight)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleCustomPrompt();
                  }
                }}
                placeholder="Ask a follow-up..."
                disabled={!available || loading}
                rows={1}
                className="flex-1 px-3 py-2 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 resize-none overflow-y-auto"
                style={{ maxHeight: '4.5rem' }}
              />
              <button
                onClick={handleCustomPrompt}
                disabled={!available || loading || !customPrompt.trim()}
                className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Send message"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
