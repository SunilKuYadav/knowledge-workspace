"use client";

import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { useQuickChat } from "./useQuickChat";
import { MarkdownRenderer } from "../MarkdownRenderer";

export default function QuickChatPanel() {
  const {
    isOpen,
    close,
    activeTab,
    visibleTabs,
    createTab,
    setActiveTab,
    deleteTab,
    sendMessage,
    stopGeneration,
  } = useQuickChat();

  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeTab?.messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Track streaming state from last message
  useEffect(() => {
    if (!activeTab) return;
    const msgs = activeTab.messages;
    const lastMsg = msgs[msgs.length - 1];
    if (lastMsg?.role === "assistant" && lastMsg.content === "") {
      setIsStreaming(true);
    } else {
      setIsStreaming(false);
    }
  }, [activeTab?.messages]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!input.trim() || isStreaming) return;
    const prompt = input;
    setInput("");
    setIsStreaming(true);
    await sendMessage(prompt);
    setIsStreaming(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="fixed top-0 right-0 z-50 flex flex-col w-[420px] h-[95vh] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            ⚡ Quick Chat
          </span>
          <span className="text-xs text-gray-400">(fast model)</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => createTab()}
            className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            title="New chat tab"
            aria-label="New chat tab"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
          <button
            onClick={close}
            className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Close"
            aria-label="Close quick chat"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Tabs */}
      {visibleTabs.length > 1 && (
        <div className="flex items-center gap-1 px-2 py-1 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 overflow-x-auto">
          {visibleTabs.map((tab) => (
            <div
              key={tab.id}
              className={`group flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer whitespace-nowrap ${
                tab.id === activeTab?.id
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="max-w-[100px] truncate">{tab.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteTab(tab.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-500 rounded"
                title="Delete chat"
                aria-label={`Delete ${tab.title}`}
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {activeTab && !activeTab.messagesLoaded && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 dark:text-gray-500">
            <span className="inline-flex items-center gap-1">
              <span className="animate-pulse">●</span>
              <span className="animate-pulse delay-100">●</span>
              <span className="animate-pulse delay-200">●</span>
            </span>
            <p className="text-xs mt-2">Loading conversation...</p>
          </div>
        )}
        {activeTab &&
          activeTab.messagesLoaded &&
          activeTab.messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 dark:text-gray-500">
              <p className="text-sm">
                Ask anything — quick questions, brainstorming, explanations.
              </p>
              <p className="text-xs mt-1">
                Uses the fast model for snappy responses.
              </p>
            </div>
          )}
        {activeTab?.messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
              }`}
            >
              {msg.role === "assistant" ? (
                msg.content ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_pre]:my-1 [&_ul]:my-1 [&_ol]:my-1">
                    <MarkdownRenderer children={msg.content} />
                  </div>
                ) : (
                  <span className="inline-flex items-center gap-1 text-gray-400">
                    <span className="animate-pulse">●</span>
                    <span className="animate-pulse delay-100">●</span>
                    <span className="animate-pulse delay-200">●</span>
                  </span>
                )
              ) : (
                <span className="whitespace-pre-wrap">{msg.content}</span>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-2">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a quick question..."
            rows={1}
            className="flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-[80px]"
            aria-label="Quick chat message input"
          />
          {isStreaming ? (
            <button
              onClick={stopGeneration}
              className="px-3 py-2 rounded-lg bg-red-500 text-white text-sm hover:bg-red-600 transition-colors"
              aria-label="Stop generation"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!input.trim()}
              className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Send message"
            >
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
