"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { UrlBadge } from "@/components/url-badge";
import { ChatMessages } from "@/components/chat-messages";
import { ChatInput } from "@/components/chat-input";
import { useMemo, useState } from "react";

interface ChatViewProps {
  chatId: string;
  pages: { url: string; title: string | null }[];
  initialMessages: { id: string; role: "user" | "assistant"; content: string }[];
}

export function ChatView({ chatId, pages, initialMessages }: ChatViewProps) {
  const [input, setInput] = useState("");

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

  function handleSubmit() {
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput("");
    sendMessage({ text });
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-4 py-3 md:pl-4 pl-14">
        <UrlBadge pages={pages} />
      </div>
      <ChatMessages messages={displayMessages} isLoading={isLoading} />
      <ChatInput
        input={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}
