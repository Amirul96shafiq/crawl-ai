"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NewChatDialog } from "@/components/new-chat-dialog";
import { UserMenu } from "@/components/user-menu";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MessageSquare, Trash2, Menu, Globe, X } from "lucide-react";

interface ChatItem {
  id: string;
  title: string | null;
  createdAt: string;
  pages: { url: string; title: string | null }[];
}

interface ChatSidebarProps {
  user: { name?: string | null; email?: string | null } | null;
  guestRemaining?: number;
}

function SidebarContent({
  user,
  guestRemaining,
  chats,
  activeChatId,
  onDelete,
}: ChatSidebarProps & {
  chats: ChatItem[];
  activeChatId: string | null;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();

  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <NewChatDialog guestRemaining={guestRemaining} />
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={cn(
                "group flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-accent transition-colors",
                activeChatId === chat.id && "bg-accent",
              )}
              onClick={() => router.push(`/chat/${chat.id}`)}
            >
              <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">
                {chat.title || "New Chat"}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="bottom">
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(chat.id);
                    }}
                  >
                    <Trash2 />
                    Delete chat
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                    <X />
                    Cancel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
          {chats.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No chats yet</p>
              <p className="text-xs mt-1">Enter a URL to get started</p>
            </div>
          )}
        </div>
      </ScrollArea>
      <Separator />
      <div className="p-3">
        <UserMenu user={user} guestRemaining={guestRemaining} />
      </div>
    </div>
  );
}

export function ChatSidebar({ user, guestRemaining }: ChatSidebarProps) {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const pathname = usePathname();
  const router = useRouter();
  const activeChatId = pathname.startsWith("/chat/")
    ? pathname.split("/")[2]
    : null;

  useEffect(() => {
    fetchChats();
  }, [pathname, user?.email]);

  async function fetchChats() {
    try {
      const res = await fetch("/api/chats");
      if (res.ok) {
        const data = await res.json();
        setChats(data.chats);
      }
    } catch {
      // silently fail
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/chats/${id}`, { method: "DELETE" });
      if (res.ok) {
        setChats((prev) => prev.filter((c) => c.id !== id));
        if (activeChatId === id) {
          router.push("/");
        }
      }
    } catch {
      // silently fail
    }
  }

  const sidebarContent = (
    <SidebarContent
      user={user}
      guestRemaining={guestRemaining}
      chats={chats}
      activeChatId={activeChatId}
      onDelete={handleDelete}
    />
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[280px] border-r bg-card h-screen flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden fixed top-3 left-3 z-40"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0">
          {sidebarContent}
        </SheetContent>
      </Sheet>
    </>
  );
}
