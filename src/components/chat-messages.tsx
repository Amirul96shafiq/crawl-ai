"use client";

import { useEffect, useState } from "react";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { useAppearance } from "@/components/appearance-provider";
import { MemoizedMarkdown } from "@/components/memoized-markdown";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_QUESTIONS = [
  "Summarize the main points",
  "What are the key takeaways?",
  "Explain this in simpler terms",
  "What questions does this article answer?",
  "Are there important caveats or limitations?",
] as const;

interface ChatMessagesProps {
  messages: DisplayMessage[];
  isLoading: boolean;
  highlightMessageId?: string;
  featuredImageUrl?: string | null;
  primaryPageUrl?: string;
  pages?: { url: string; title: string | null }[];
  onSuggestionClick?: (text: string) => void;
}

export function ChatMessages({
  messages,
  isLoading,
  highlightMessageId,
  featuredImageUrl,
  primaryPageUrl,
  pages,
  onSuggestionClick,
}: ChatMessagesProps) {
  const scrollRef = useScrollToBottom<HTMLDivElement>(messages);
  const { compact, chatFontSize, chatLineSpacing } = useAppearance();
  const [imageError, setImageError] = useState(false);
  const showFeaturedImage = featuredImageUrl && !imageError;

  const fontSizeClass =
    chatFontSize === "small"
      ? "text-xs"
      : chatFontSize === "large"
        ? "text-base"
        : "text-sm";
  const lineSpacingClass =
    chatLineSpacing === "tight"
      ? "leading-snug"
      : chatLineSpacing === "relaxed"
        ? "leading-loose"
        : "leading-relaxed";

  useEffect(() => {
    if (!highlightMessageId || !scrollRef.current) return;
    const el = scrollRef.current.querySelector(
      `[data-message-id="${highlightMessageId}"]`,
    );
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightMessageId, messages]);

  const featuredImageBlock = showFeaturedImage && (
    <div className="mx-auto max-w-3xl w-full mb-4">
      {primaryPageUrl ? (
        <a
          href={primaryPageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-xl overflow-hidden border bg-muted"
        >
          <img
            src={featuredImageUrl}
            alt=""
            className="w-full max-h-48 object-cover"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
          />
        </a>
      ) : (
        <div className="rounded-xl overflow-hidden border bg-muted">
          <img
            src={featuredImageUrl}
            alt=""
            className="w-full max-h-48 object-cover"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
          />
        </div>
      )}
    </div>
  );

  if (!messages.length) {
    let pageContext: string | null = null;
    if (pages && pages.length > 0) {
      const firstTitle =
        pages[0].title ||
        (() => {
          try {
            return new URL(pages[0].url).hostname;
          } catch {
            return "the page";
          }
        })();
      pageContext =
        pages.length === 1
          ? `Content from: ${firstTitle}`
          : `You've loaded ${pages.length} pages`;
    }

    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground overflow-y-auto">
        <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
          {featuredImageBlock}
          <div className="w-full max-w-2xl rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex flex-col items-center text-center space-y-4">
              <Bot className="h-12 w-12 mx-auto opacity-50" />
              <div className="space-y-2">
                <p className="text-lg font-medium">Ready to explore</p>
                <p className="text-sm">
                  Ask anything about the crawled page(s)
                </p>
                {pageContext && (
                  <p className="text-xs text-muted-foreground">{pageContext}</p>
                )}
              </div>
              {onSuggestionClick && (
                <div className="flex flex-wrap gap-2 justify-center pt-2">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => onSuggestionClick(q)}
                      className="rounded-full border bg-background px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
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
        className={cn("mx-auto max-w-3xl", compact ? "space-y-2" : "space-y-6")}
      >
        {featuredImageBlock}
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
                "max-w-[85%]",
                fontSizeClass,
                lineSpacingClass,
                compact ? "rounded-lg px-3 py-1.5" : "rounded-2xl px-4 py-2.5",
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted",
                message.id === highlightMessageId &&
                  "ring-4 ring-primary ring-offset-4 ring-offset-background",
              )}
            >
              {message.role === "assistant" ? (
                message.content ? (
                  <MemoizedMarkdown content={message.content} id={message.id} />
                ) : null
              ) : (
                <span className="whitespace-pre-wrap">{message.content}</span>
              )}
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
