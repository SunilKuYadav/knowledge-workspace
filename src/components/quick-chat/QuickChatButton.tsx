"use client";

import { useQuickChatStore } from "./quickChatStore";

/**
 * Floating action button (bottom-right) that toggles the Quick Chat panel.
 */
export default function QuickChatButton() {
  const { isOpen, toggle } = useQuickChatStore();

  return (
    <button
      onClick={toggle}
      className={`fixed top-1 right-1 z-50 flex items-center justify-center w-8 h-8 rounded-full shadow-lg transition-all duration-200 ${
        isOpen
          ? "bg-gray-600 hover:bg-gray-700 scale-90"
          : "bg-blue-600 hover:bg-blue-700 hover:scale-105"
      }`}
      title={isOpen ? "Close Quick Chat" : "Open Quick Chat"}
      aria-label={isOpen ? "Close Quick Chat" : "Open Quick Chat"}
    >
      {isOpen ? (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      )}
    </button>
  );
}
