"use client";

/**
 * Quick Chat — floating button + chat panel composite component.
 * Renders both the floating toggle button and the chat panel.
 * Placed in the root layout for app-wide availability.
 */

import QuickChatButton from "./QuickChatButton";
import QuickChatPanel from "./QuickChatPanel";

export default function QuickChat() {
  return (
    <>
      <QuickChatPanel />
      <QuickChatButton />
    </>
  );
}
