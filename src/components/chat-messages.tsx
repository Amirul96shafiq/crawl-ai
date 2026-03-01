"use client";

import { useEffect, useState, type RefObject } from "react";
import { useAppearance } from "@/components/appearance-provider";
import { MemoizedMarkdown } from "@/components/memoized-markdown";
import { Bot, Calendar, Clock, Copy, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  createdAt?: string | null;
}

const SUGGESTED_QUESTIONS = [
  "Summarize the main points",
  "What are the key takeaways?",
  "Explain this in simpler terms",
  "What questions does this article answer?",
  "Are there important caveats or limitations?",
] as const;

interface ChatMessagesProps {
  scrollRef: RefObject<HTMLDivElement | null>;
  messages: DisplayMessage[];
  isLoading: boolean;
  highlightMessageId?: string;
  featuredImageUrl?: string | null;
  primaryPageUrl?: string;
  pages?: { url: string; title: string | null }[];
  onSuggestionClick?: (text: string) => void;
}

export function ChatMessages({
  scrollRef,
  messages,
  isLoading,
  highlightMessageId,
  featuredImageUrl,
  primaryPageUrl,
  pages,
  onSuggestionClick,
}: ChatMessagesProps) {
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

    function scrollToMessage() {
      const container = scrollRef.current;
      if (!container) return;
      const el = container.querySelector<HTMLElement>(
        `[data-message-id="${highlightMessageId}"]`,
      );
      if (!el) return;

      const elRect = el.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const stickyTopOffset = 5 * 16;
      const scrollTop =
        container.scrollTop +
        (elRect.top - containerRect.top) -
        stickyTopOffset;

      container.scrollTo({ top: Math.max(0, scrollTop), behavior: "smooth" });
    }

    const t1 = requestAnimationFrame(() => scrollToMessage());
    const t2 = setTimeout(scrollToMessage, 100);
    const t3 = setTimeout(scrollToMessage, 400);
    return () => {
      cancelAnimationFrame(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
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
      <div className="min-h-[calc(100vh-14rem)] flex flex-col items-center justify-center text-muted-foreground">
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
      className={cn(
        compact ? "p-2 pt-4" : "p-4 pt-6",
      )}
    >
      <div
        className={cn("mx-auto max-w-3xl", compact ? "space-y-2" : "space-y-6")}
      >
        {featuredImageBlock}
        {messages.map((message) => {
          const tokenCount =
            message.role === "user"
              ? message.inputTokens
              : message.outputTokens;
          return (
            <div
              key={message.id}
              className={cn(
                "flex flex-col scroll-mt-4 scroll-mb-4",
                compact ? "gap-1" : "gap-1.5",
                message.role === "user" ? "items-end" : "items-start",
              )}
            >
              <div
                className={cn(
                  "flex w-full",
                  compact ? "gap-2" : "gap-3",
                  message.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  data-message-id={message.id}
                  className={cn(
                    message.role === "user"
                      ? "w-fit max-w-[50%] shrink-0"
                      : "max-w-[85%]",
                    fontSizeClass,
                    lineSpacingClass,
                    compact
                      ? "rounded-xl px-3 py-2"
                      : "rounded-2xl px-4 py-2.5",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted",
                    message.id === highlightMessageId &&
                      "ring-4 ring-primary ring-offset-4 ring-offset-background",
                  )}
                >
                  {message.role === "assistant" ? (
                    message.content ? (
                      <MemoizedMarkdown
                        content={message.content}
                        id={message.id}
                      />
                    ) : null
                  ) : (
                    <span className="whitespace-pre-wrap">
                      {message.content}
                    </span>
                  )}
                </div>
              </div>
              <div
                className={cn(
                  "flex items-center gap-1",
                  message.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                {message.role === "user" && tokenCount != null && tokenCount > 0 && (
                  <span className="text-xs text-muted-foreground/80">
                    ~{tokenCount.toLocaleString()} tokens
                  </span>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="h-6 w-6 text-muted-foreground/80 hover:text-muted-foreground"
                    >
                      <MoreHorizontal className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align={message.role === "user" ? "end" : "start"}
                    side="top"
                    className="min-w-36"
                  >
                    <DropdownMenuItem
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(message.content);
                          toast.success("Copied to clipboard");
                        } catch {
                          toast.error("Failed to copy");
                        }
                      }}
                    >
                      <Copy className="size-3.5 shrink-0" />
                      Copy
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-2 text-xs space-y-1.5">
                      {message.createdAt ? (
                        <>
                          <p className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="size-3.5 shrink-0" />
                            {new Date(message.createdAt).toLocaleDateString(
                              undefined,
                              { dateStyle: "medium" },
                            )}
                          </p>
                          <p className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="size-3.5 shrink-0" />
                            {new Date(message.createdAt).toLocaleTimeString(
                              undefined,
                              { timeStyle: "short" },
                            )}
                          </p>
                        </>
                      ) : (
                        <p className="text-muted-foreground">—</p>
                      )}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
                {message.role === "assistant" && tokenCount != null && tokenCount > 0 && (
                  <span className="text-xs text-muted-foreground/80">
                    ~{tokenCount.toLocaleString()} tokens
                  </span>
                )}
              </div>
            </div>
          );
        })}
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
