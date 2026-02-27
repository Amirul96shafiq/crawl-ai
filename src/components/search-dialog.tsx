"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageSquare, FileText, Type } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchMatch {
  type: "title" | "message" | "page";
  snippet: string;
  messageId?: string;
}

interface SearchResult {
  chatId: string;
  chatTitle: string | null;
  archived?: boolean;
  matches: SearchMatch[];
}

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: { name?: string | null; email?: string | null } | null;
}

const DEBOUNCE_MS = 300;

function MatchIcon({ type }: { type: SearchMatch["type"] }) {
  switch (type) {
    case "title":
      return <Type className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
    case "message":
      return <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
    case "page":
      return <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
  }
}

function MatchTypeLabel({ type }: { type: SearchMatch["type"] }) {
  switch (type) {
    case "title":
      return "Title";
    case "message":
      return "Message";
    case "page":
      return "Page content";
  }
}

export function SearchDialog({
  open,
  onOpenChange,
  user,
}: SearchDialogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const currentChatId = pathname.startsWith("/chat/")
    ? pathname.split("/")[2]
    : null;

  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"current" | "all">("all");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const isLoggedIn = !!user;
  const canSearchCurrent = !!currentChatId;

  const doSearch = useCallback(async () => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const params = new URLSearchParams({
        q,
        scope,
        includeArchived: String(includeArchived),
      });
      if (currentChatId) {
        params.set("chatId", currentChatId);
      }
      const res = await fetch(`/api/search?${params}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results ?? []);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, scope, includeArchived, currentChatId]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(doSearch, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [open, query, scope, includeArchived, doSearch]);

  function handleResultClick(
    chatId: string,
    messageId: string | undefined,
    archived: boolean,
  ) {
    onOpenChange(false);
    if (archived) {
      router.push(`/archive?highlight=${chatId}`);
    } else {
      router.push(`/chat/${chatId}${messageId ? `?highlight=${messageId}` : ""}`);
    }
  }

  const canSearch = scope === "all" || (scope === "current" && canSearchCurrent);
  const showIncludeArchived = isLoggedIn && scope === "all";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-xl max-h-[85vh] flex flex-col overflow-hidden"
        showCloseButton={true}
      >
        <div className="flex flex-col gap-4 shrink-0">
          <DialogHeader>
            <DialogTitle>Search chats</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              placeholder="Search titles, messages, page content…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-normal text-muted-foreground">
                  Scope:
                </Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setScope("current")}
                    disabled={!canSearchCurrent}
                    className={cn(
                      "text-xs px-2 py-1 rounded-md transition-colors",
                      scope === "current"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80",
                      !canSearchCurrent && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    Current chat
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope("all")}
                    className={cn(
                      "text-xs px-2 py-1 rounded-md transition-colors",
                      scope === "all"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80",
                    )}
                  >
                    All chats
                  </button>
                </div>
              </div>
              {showIncludeArchived && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={includeArchived}
                    onCheckedChange={(v) => setIncludeArchived(!!v)}
                  />
                  <span className="text-xs text-muted-foreground">
                    Include archived chats
                  </span>
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="mt-2 flex flex-col overflow-hidden rounded-md border bg-muted/30">
          <ScrollArea className="h-[min(400px,50vh)] rounded-[inherit]">
            <div className="p-2 space-y-4 min-w-0">
              {!canSearch && scope === "current" && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Open a chat to search within it.
                </p>
              )}
              {canSearch && query.trim().length < 2 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Enter at least 2 characters to search.
                </p>
              )}
              {canSearch && query.trim().length >= 2 && loading && (
                <div className="flex items-center justify-center gap-2 py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Searching…</span>
                </div>
              )}
              {canSearch &&
                !loading &&
                searched &&
                results.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No matches found.
                  </p>
                )}
              {canSearch &&
                !loading &&
                results.length > 0 &&
                results.map((result) => (
                  <div key={result.chatId} className="space-y-2">
                    <div className="text-sm font-medium truncate">
                      {result.chatTitle || "New Chat"}
                    </div>
                    <ul className="space-y-1">
                      {result.matches.map((match, i) => (
                        <li key={`${match.type}-${i}`}>
                          <button
                            type="button"
                            onClick={() =>
                              handleResultClick(
                                result.chatId,
                                match.messageId,
                                result.archived ?? false,
                              )
                            }
                            className="w-full text-left flex gap-2 items-start p-2 rounded-md hover:bg-accent transition-colors overflow-hidden min-w-0"
                          >
                            <MatchIcon type={match.type} />
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <span className="text-xs text-muted-foreground">
                                <MatchTypeLabel type={match.type} />:{" "}
                              </span>
                              <span className="text-sm break-words block">
                                {match.snippet}
                              </span>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
