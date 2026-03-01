"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArchivedChatDialog } from "@/components/archived-chat-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Archive, Trash2, ArchiveRestore, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ArchivedChatItem {
  id: string;
  title: string | null;
  createdAt: string;
  archivedAt: string | null;
  pages: { url: string; title: string | null }[];
}

interface ChatWithMessages {
  id: string;
  title: string | null;
  pages: { url: string; title: string | null }[];
  messages: { id: string; role: string; content: string }[];
}

export function ArchiveView() {
  const searchParams = useSearchParams();
  const highlightChatId = searchParams.get("highlight") ?? undefined;
  const scrollRef = useRef<HTMLUListElement>(null);
  const [chats, setChats] = useState<ArchivedChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedChat, setSelectedChat] = useState<ChatWithMessages | null>(null);
  const [loadingChat, setLoadingChat] = useState(false);
  const [deleteConfirmChatId, setDeleteConfirmChatId] = useState<string | null>(null);

  const [identityKey, setIdentityKey] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/chats?archived=true&limit=100")
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        setChats(data.chats ?? []);
        if (data.identityKey) setIdentityKey(data.identityKey);
      })
      .catch(() => setChats([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!highlightChatId || !scrollRef.current) return;
    const el = scrollRef.current.querySelector(
      `[data-chat-id="${highlightChatId}"]`,
    );
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightChatId, chats]);

  function removeFromStoredOrder(chatId: string) {
    if (typeof window === "undefined" || !identityKey) return;
    try {
      const key = "chat-order-" + identityKey;
      const raw = localStorage.getItem(key);
      const orderedIds = raw ? (JSON.parse(raw) as string[]) : [];
      const updated = orderedIds.filter((id) => id !== chatId);
      localStorage.setItem(key, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }

  async function handleUnarchive(id: string) {
    try {
      const res = await fetch(`/api/chats/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: false }),
      });
      if (res.ok) {
        removeFromStoredOrder(id);
        setChats((prev) => prev.filter((c) => c.id !== id));
        if (selectedChat?.id === id) setDialogOpen(false);
        toast.success("Chat restored");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("chat-restored"));
        }
      } else {
        toast.error("Failed to restore chat");
      }
    } catch {
      toast.error("Failed to restore chat");
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/chats/${id}`, { method: "DELETE" });
      if (res.ok) {
        setChats((prev) => prev.filter((c) => c.id !== id));
        if (selectedChat?.id === id) setDialogOpen(false);
        setDeleteConfirmChatId(null);
        toast.success("Chat deleted");
      } else {
        toast.error("Failed to delete chat");
      }
    } catch {
      toast.error("Failed to delete chat");
    }
  }

  async function handleChatClick(chat: ArchivedChatItem) {
    setLoadingChat(true);
    setDialogOpen(true);
    try {
      const res = await fetch(`/api/chats/${chat.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedChat(data);
      } else {
        toast.error("Failed to load chat");
        setDialogOpen(false);
      }
    } catch {
      toast.error("Failed to load chat");
      setDialogOpen(false);
    } finally {
      setLoadingChat(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
          <div className="space-y-2 flex-1 min-w-0">
            <Skeleton className="h-7 w-48 rounded" />
            <Skeleton className="h-4 w-64 rounded" />
          </div>
        </div>
        <ul className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <li
              key={i}
              className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3"
            >
              <Skeleton className="h-4 flex-1 min-w-0 rounded" />
              <Skeleton className="h-6 w-6 shrink-0 rounded" />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
          <Archive className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Archived Chats</h1>
        </div>
      </div>

      {chats.length === 0 ? (
        <div className="flex flex-col items-left justify-left py-10 px-4">
          <p className="text-sm font-medium text-foreground">
            No archived chats
          </p>
          <p className="text-xs text-muted-foreground mt-1 text-left">
            Use the{" "}
            <span className="mx-1.5 inline-flex h-6 items-center gap-1.5 rounded-sm bg-primary px-2 text-xs font-medium text-primary-foreground [&_svg]:size-3">
              <Archive className="h-3 w-3" />
              Archive
            </span>{" "}
            option in the chat menu <b>(⋮)</b> on the sidebar to move chats here.
          </p>
        </div>
      ) : (
        <ul ref={scrollRef} className="space-y-2">
          {chats.map((chat) => (
            <li
              key={chat.id}
              data-chat-id={chat.id}
              className={cn(
                "group flex items-center gap-3 rounded-lg border bg-card px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer",
                chat.id === highlightChatId &&
                  "ring-4 ring-primary ring-offset-4 ring-offset-background",
              )}
              onClick={() => handleChatClick(chat)}
            >
              <span className="flex-1 min-w-0 truncate text-sm font-medium">
                {chat.title || "New Chat"}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="bottom">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnarchive(chat.id);
                    }}
                  >
                    <ArchiveRestore />
                    Restore chat
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={(e) => e.stopPropagation()}
                    onSelect={() => setDeleteConfirmChatId(chat.id)}
                  >
                    <Trash2 />
                    Delete permanently
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={deleteConfirmChatId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmChatId(null)}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete chat?</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this chat? This cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmChatId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleteConfirmChatId && handleDelete(deleteConfirmChatId)
              }
            >
              Yes, delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ArchivedChatDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={selectedChat?.title ?? null}
        pages={selectedChat?.pages ?? []}
        messages={selectedChat?.messages ?? []}
        loading={loadingChat}
      />
    </div>
  );
}
