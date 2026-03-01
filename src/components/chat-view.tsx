"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useSearchParams } from "next/navigation";
import { UrlBadge } from "@/components/url-badge";
import { ChatMessages } from "@/components/chat-messages";
import { ChatInput } from "@/components/chat-input";
import { useAppearance } from "@/components/appearance-provider";
import { useMemo, useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MessageTokens {
  inputTokens?: number;
  outputTokens?: number;
}

interface ChatViewProps {
  chatId: string;
  pages: {
    url: string;
    title: string | null;
    featuredImageUrl?: string | null;
    tokenCount?: number | null;
  }[];
  initialMessages: {
    id: string;
    role: "user" | "assistant";
    content: string;
    inputTokens?: number | null;
    outputTokens?: number | null;
    createdAt?: string;
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
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [remainingFromSession, setRemainingFromSession] = useState(
    initialRemainingQuestions,
  );
  const [fetchedTokens, setFetchedTokens] = useState<MessageTokens[]>([]);
  const wasLoadingRef = useRef(false);
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

  useEffect(() => {
    if (wasLoadingRef.current && !isLoading) {
      fetch(`/api/chats/${chatId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.messages?.length) {
            setFetchedTokens(
              data.messages.map((m: { inputTokens?: number; outputTokens?: number }) => ({
                inputTokens: m.inputTokens,
                outputTokens: m.outputTokens,
              })),
            );
          }
        })
        .catch(() => {});
    }
    wasLoadingRef.current = isLoading;
  }, [isLoading, chatId]);

  const initialMap = useMemo(
    () =>
      new Map(
        initialMessages.map((m) => [
          m.id,
          {
            inputTokens: m.inputTokens,
            outputTokens: m.outputTokens,
            createdAt: m.createdAt,
          },
        ]),
      ),
    [initialMessages],
  );

  const displayMessages = messages.map((m, i) => {
    const fetched = fetchedTokens[i];
    const initial = initialMap.get(m.id);
    const inputTokens = fetched?.inputTokens ?? initial?.inputTokens;
    const outputTokens = fetched?.outputTokens ?? initial?.outputTokens;
    const createdAt =
      initial?.createdAt ??
      (m as { createdAt?: Date }).createdAt?.toISOString?.() ??
      new Date().toISOString();
    return {
      id: m.id,
      role: m.role as "user" | "assistant",
      content:
        m.parts
          ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
          .map((p) => p.text)
          .join("") || "",
      inputTokens,
      outputTokens,
      createdAt,
    };
  });

  const userMessageCount = displayMessages.filter(
    (m) => m.role === "user",
  ).length;
  const remainingQuestions = resetsDaily
    ? remainingFromSession
    : userMessageLimit - userMessageCount;
  const canSendMessage = remainingQuestions > 0;

  function handleSuggestionClick(text: string) {
    setInput(text);
    inputRef.current?.focus();
  }

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
          "px-4 pt-6 pb-3",
          compact && "py-2 px-2",
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
        pages={pages}
        onSuggestionClick={handleSuggestionClick}
      />
      <ChatInput
        ref={inputRef}
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
