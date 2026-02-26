"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { UrlBadge } from "@/components/url-badge";
import { ChatMessages } from "@/components/chat-messages";
import { ChatInput } from "@/components/chat-input";
import { useAppearance } from "@/components/appearance-provider";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

interface ChatViewProps {
  chatId: string;
  pages: { url: string; title: string | null }[];
  initialMessages: { id: string; role: "user" | "assistant"; content: string }[];
}

export function ChatView({ chatId, pages, initialMessages }: ChatViewProps) {
  const [input, setInput] = useState("");
  const { compact } = useAppearance();

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
      <div
        className={cn(
          "pl-14 pr-4 pt-6 pb-3 md:pl-4",
          compact && "pr-2 py-2 md:px-2 md:py-2",
        )}
      >
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
