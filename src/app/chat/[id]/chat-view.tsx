"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { UrlBadge } from "@/components/url-badge";
import { ChatMessages } from "@/components/chat-messages";
import { ChatInput } from "@/components/chat-input";
import { useMemo, useState, useRef } from "react";

interface ChatViewProps {
  chatId: string;
  pages: { url: string; title: string | null }[];
  initialMessages: {
    id: string;
    role: "user" | "assistant";
    content: string;
  }[];
}

/**
 * ChatView function logic.
 * Inputs: function parameters.
 * Outputs: function return value.
 * Side effects: none unless stated in implementation.
 * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
 */
export function ChatView({ chatId, pages, initialMessages }: ChatViewProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat", body: { chatId } }),
    [chatId],
  );

  const { messages, sendMessage, status } = useChat({
    transport,
    messages: initialMessages.map((m) => ({
      id: m.id,
      role: m.role,
      parts: [{ type: "text" as const, text: m.content }],
      createdAt: new Date(),
    })),
  });

  const isLoading = status === "submitted" || status === "streaming";

  const displayMessages = messages.map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content:
      m.parts
        ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text)
        .join("") || "",
  }));

  /**
   * handleSubmit function logic.
   * Inputs: function parameters.
   * Outputs: function return value.
   * Side effects: none unless stated in implementation.
   * Failure behavior: follows guard clauses and thrown/runtime errors in this block.
   */
  function handleSubmit() {
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput("");
    sendMessage({ text });
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto" ref={scrollRef}>
      <div className="pl-14 pr-4 pt-6 pb-3 md:pl-4">
        <UrlBadge pages={pages} />
      </div>
      <ChatMessages
        scrollRef={scrollRef}
        messages={displayMessages}
        isLoading={isLoading}
      />
      <ChatInput
        input={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}
