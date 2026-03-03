"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useSearchParams } from "next/navigation";
import { UrlBadge } from "@/components/url-badge";
import { ChatMessages } from "@/components/chat-messages";
import { ChatInput } from "@/components/chat-input";
import { useAppearance } from "@/components/appearance-provider";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { useMemo, useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowDown, ArrowUp } from "lucide-react";

export interface MessageMetadata {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  finishReason?: string;
}

interface ChatViewProps {
  chatId: string;
  pages: {
    url: string;
    title: string | null;
    featuredImageUrl?: string | null;
    images?: string | null;
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

/**
 * Renders the interactive chat surface and coordinates streaming message state.
 */
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
  const { compact } = useAppearance();
  const searchParams = useSearchParams();
  const highlightMessageId = searchParams.get("highlight") ?? undefined;

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat", body: { chatId } }),
    [chatId],
  );

  const { messages, sendMessage, status, error } = useChat<
    UIMessage<MessageMetadata>
  >({
    transport,
    messages: initialMessages.map((m) => ({
      id: m.id,
      role: m.role,
      parts: [{ type: "text" as const, text: m.content }],
      metadata:
        m.inputTokens != null || m.outputTokens != null
          ? {
              inputTokens: m.inputTokens ?? undefined,
              outputTokens: m.outputTokens ?? undefined,
            }
          : undefined,
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

  const displayMessages = useMemo(
    () =>
      messages.map((m) => {
        const meta = m.metadata as MessageMetadata | undefined;
        const initial = initialMap.get(m.id);
        const inputTokens =
          meta?.inputTokens ?? initial?.inputTokens ?? undefined;
        const outputTokens =
          meta?.outputTokens ?? initial?.outputTokens ?? undefined;
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
          inputTokens: inputTokens ?? null,
          outputTokens: outputTokens ?? null,
          createdAt,
        };
      }),
    [messages, initialMap],
  );

  const userMessageCount = displayMessages.filter(
    (m) => m.role === "user",
  ).length;
  const remainingQuestions = resetsDaily
    ? remainingFromSession
    : userMessageLimit - userMessageCount;
  const canSendMessage = remainingQuestions > 0;

  /**
   * Moves a suggested prompt into the input and focuses the composer.
   */
  function handleSuggestionClick(text: string) {
    setInput(text);
    inputRef.current?.focus();
  }

  /**
   * Sends the current user message when limits/loading rules allow it.
   */
  function handleSubmit() {
    if (!input.trim() || isLoading || !canSendMessage) return;
    const text = input;
    setInput("");
    if (resetsDaily) {
      setRemainingFromSession((r) => Math.max(0, r - 1));
    }
    sendMessage({ text });
    window.dispatchEvent(
      new CustomEvent("echologue:chat-message-sent", { detail: { chatId } }),
    );
  }

  const scrollRef = useScrollToBottom<HTMLDivElement>(displayMessages);
  const messagesLengthRef = useRef(messages.length);

  useEffect(() => {
    if (messages.length > messagesLengthRef.current) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role === "user") {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }
    messagesLengthRef.current = messages.length;
  }, [messages]);

  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showScrollTopButton, setShowScrollTopButton] = useState(false);

  /**
   * Toggles floating scroll controls based on viewport position in the log.
   */
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      const isAtTop = scrollTop < 100;

      setShowScrollButton(!isAtBottom);
      setShowScrollTopButton(!isAtTop);
    }
  };

  /**
   * Smooth-scrolls to the newest message.
   */
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  /**
   * Smooth-scrolls to the beginning of the conversation.
   */
  const scrollToTop = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="relative h-full">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto"
      >
        <div className="min-h-full flex flex-col">
          <div
            className={cn(
              "sticky top-0 z-10 shrink-0 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 px-15 md:px-4 pt-6 pb-3",
              compact && "py-2 px-2",
            )}
          >
            <UrlBadge pages={pages} />
          </div>
          <div className="flex-1 flex flex-col pb-4">
            <ChatMessages
              scrollRef={scrollRef}
              messages={displayMessages}
              isLoading={isLoading}
              highlightMessageId={highlightMessageId}
              featuredImageUrl={pages[0]?.featuredImageUrl ?? null}
              primaryPageUrl={pages[0]?.url}
              pages={pages}
              onSuggestionClick={handleSuggestionClick}
            />
          </div>
          <div className="sticky bottom-0 z-10 shrink-0 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
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
        </div>
      </div>
      <button
        onClick={scrollToTop}
        className={cn(
          "absolute top-18 left-1/2 -translate-x-1/2 z-50 rounded-full bg-primary p-2 text-primary-foreground shadow-lg transition-all duration-300 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer",
          showScrollTopButton
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-4 pointer-events-none",
        )}
        aria-label="Scroll to top"
      >
        <ArrowUp className="h-5 w-5" />
      </button>
      <button
        onClick={scrollToBottom}
        className={cn(
          "absolute bottom-28 left-1/2 -translate-x-1/2 z-50 rounded-full bg-primary p-2 text-primary-foreground shadow-lg transition-all duration-300 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer",
          showScrollButton
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none",
        )}
        aria-label="Scroll to bottom"
      >
        <ArrowDown className="h-5 w-5" />
      </button>
    </div>
  );
}
