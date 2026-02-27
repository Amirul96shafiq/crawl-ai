"use client";

import { useEffect } from "react";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { useAppearance } from "@/components/appearance-provider";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatMessagesProps {
  messages: DisplayMessage[];
  isLoading: boolean;
  highlightMessageId?: string;
}

export function ChatMessages({
  messages,
  isLoading,
  highlightMessageId,
}: ChatMessagesProps) {
  const scrollRef = useScrollToBottom<HTMLDivElement>(messages);
  const { compact } = useAppearance();

  useEffect(() => {
    if (!highlightMessageId || !scrollRef.current) return;
    const el = scrollRef.current.querySelector(
      `[data-message-id="${highlightMessageId}"]`,
    );
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightMessageId, messages]);

  if (!messages.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-2">
          <Bot className="h-12 w-12 mx-auto opacity-50" />
          <p className="text-lg font-medium">Ask anything about the crawled page(s)</p>
          <p className="text-sm">Your questions will be answered based on the page content</p>
        </div>
      </div>
    );
  }

  const lastMessage = messages[messages.length - 1];

  return (
    <div
      ref={scrollRef}
      className={cn(
        "flex-1 overflow-y-auto",
        compact ? "p-2 pt-4" : "p-4 pt-6",
      )}
    >
      <div
        className={cn(
          "mx-auto max-w-3xl",
          compact ? "space-y-2" : "space-y-6",
        )}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex scroll-mt-4 scroll-mb-4",
              compact ? "gap-2" : "gap-3",
              message.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            <div
              data-message-id={message.id}
              className={cn(
                "max-w-[85%] whitespace-pre-wrap text-sm leading-relaxed",
                compact ? "rounded-lg px-3 py-1.5" : "rounded-2xl px-4 py-2.5",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted",
                message.id === highlightMessageId &&
                  "ring-4 ring-primary ring-offset-4 ring-offset-background",
              )}
            >
              {message.content}
            </div>
          </div>
        ))}
        {isLoading && lastMessage?.role === "user" && (
          <div className={cn("flex", compact ? "gap-2" : "gap-3")}>
            <div
              className={cn(
                "bg-muted",
                compact ? "rounded-lg px-3 py-1.5" : "rounded-2xl px-4 py-2.5",
              )}
            >
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
