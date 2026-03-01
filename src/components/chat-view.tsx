"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useSearchParams } from "next/navigation";
import { UrlBadge } from "@/components/url-badge";
import { ChatMessages } from "@/components/chat-messages";
import { ChatInput } from "@/components/chat-input";
import { useAppearance } from "@/components/appearance-provider";
import { useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ChatViewProps {
  chatId: string;
  pages: {
    url: string;
    title: string | null;
    featuredImageUrl?: string | null;
  }[];
  initialMessages: {
    id: string;
    role: "user" | "assistant";
    content: string;
  }[];
  userMessageLimit: number;
  resetsDaily: boolean;
  initialRemainingQuestions: number;
}

export function ChatView({
  chatId,
  pages,
  initialMessages,
  userMessageLimit,
  resetsDaily,
  initialRemainingQuestions,
}: ChatViewProps) {
  const [input, setInput] = useState("");
  const [remainingFromSession, setRemainingFromSession] = useState(
    initialRemainingQuestions,
  );
  const { compact } = useAppearance();
  const searchParams = useSearchParams();
  const highlightMessageId = searchParams.get("highlight") ?? undefined;

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat", body: { chatId } }),
    [chatId],
  );

  const { messages, sendMessage, status, error } = useChat({
    transport,
    messages: initialMessages.map((m) => ({
      id: m.id,
      role: m.role,
      parts: [{ type: "text" as const, text: m.content }],
      createdAt: new Date(),
    })),
  });

  useEffect(() => {
    if (error) {
      const message =
        error.message?.includes("429") ||
        error.message?.toLowerCase().includes("limit")
          ? resetsDaily
            ? "Daily question limit reached for this chat."
            : "Question limit reached for this chat."
          : error.message || "Something went wrong. Please try again.";
      toast.error(message);
    }
  }, [error, resetsDaily]);

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

  const userMessageCount = displayMessages.filter(
    (m) => m.role === "user",
  ).length;
  const remainingQuestions = resetsDaily
    ? remainingFromSession
    : userMessageLimit - userMessageCount;
  const canSendMessage = remainingQuestions > 0;

  function handleSubmit() {
    if (!input.trim() || isLoading || !canSendMessage) return;
    const text = input;
    setInput("");
    if (resetsDaily) {
      setRemainingFromSession((r) => Math.max(0, r - 1));
    }
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
      <ChatMessages
        messages={displayMessages}
        isLoading={isLoading}
        highlightMessageId={highlightMessageId}
        featuredImageUrl={pages[0]?.featuredImageUrl ?? null}
        primaryPageUrl={pages[0]?.url}
      />
      <ChatInput
        input={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        disabled={!canSendMessage}
        remainingQuestions={remainingQuestions}
        questionLimit={userMessageLimit}
        resetsDaily={resetsDaily}
      />
    </div>
  );
}
