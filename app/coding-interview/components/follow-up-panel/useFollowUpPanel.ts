import { useState, useRef, useEffect } from "react";
import type { ConversationMessage } from "../../lib/types";
import { MAX_CHARS } from "./constants";

interface UseFollowUpPanelParams {
  messages: ConversationMessage[];
  onSendResponse: (response: string) => void;
  isLoading: boolean;
}

export function useFollowUpPanel({
  messages,
  onSendResponse,
  isLoading,
}: UseFollowUpPanelParams) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const charCount = input.length;
  const isOverLimit = charCount > MAX_CHARS;
  const isSendDisabled = input.trim().length === 0 || isOverLimit || isLoading;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    if (isSendDisabled) return;
    onSendResponse(input.trim());
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return {
    input,
    setInput,
    messagesEndRef,
    charCount,
    isOverLimit,
    isSendDisabled,
    handleSend,
    handleKeyDown,
  };
}
