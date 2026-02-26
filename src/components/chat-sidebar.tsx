"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NewChatDialog } from "@/components/new-chat-dialog";
import { UserMenu } from "@/components/user-menu";
import { useAppearance } from "@/components/appearance-provider";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Trash2, Menu, Globe, X, PanelLeftClose, PanelLeft, Plus } from "lucide-react";

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
  onCollapse,
}: ChatSidebarProps & {
  chats: ChatItem[];
  activeChatId: string | null;
  onDelete: (id: string) => void;
  onCollapse?: () => void;
}) {
  const router = useRouter();
  const { compact } = useAppearance();

  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "flex items-center gap-2",
          compact ? "p-2" : "p-3",
        )}
      >
        <div className="flex-1">
          <NewChatDialog guestRemaining={guestRemaining} />
        </div>
        {onCollapse && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={onCollapse}
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Collapse sidebar</TooltipContent>
          </Tooltip>
        )}
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <div
          className={cn(
            "space-y-1",
            compact ? "p-1" : "p-2",
          )}
        >
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={cn(
                "group flex items-center gap-2 rounded-lg text-sm cursor-pointer hover:bg-accent transition-colors",
                compact ? "px-2 py-0.5" : "px-3 py-1",
                activeChatId === chat.id && "bg-accent",
              )}
              onClick={() => router.push(`/chat/${chat.id}`)}
            >
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
      <div className={compact ? "p-2" : "p-3"}>
        <UserMenu user={user} guestRemaining={guestRemaining} />
      </div>
    </div>
  );
}

export function ChatSidebar({ user, guestRemaining }: ChatSidebarProps) {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [collapsed, setCollapsed] = useState(false);
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

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex border-r bg-card h-screen shrink-0 overflow-hidden relative transition-[width] duration-300 ease-in-out",
          collapsed ? "w-12" : "w-[280px]",
        )}
      >
        {/* Collapsed icons */}
        <div
          className={cn(
            "absolute inset-y-0 left-0 w-12 flex flex-col items-center py-3 gap-2 transition-opacity duration-200",
            collapsed
              ? "opacity-100 delay-150 pointer-events-auto"
              : "opacity-0 pointer-events-none",
          )}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <NewChatDialog guestRemaining={guestRemaining}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Plus className="h-4 w-4" />
                </Button>
              </NewChatDialog>
            </TooltipTrigger>
            <TooltipContent>New chat</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCollapsed(false)}
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>
          <div className="mt-auto">
            <UserMenu user={user} guestRemaining={guestRemaining} collapsed />
          </div>
        </div>

        {/* Expanded content */}
        <div
          className={cn(
            "h-full w-[280px] min-w-[280px] transition-opacity duration-200",
            collapsed
              ? "opacity-0 pointer-events-none"
              : "opacity-100 delay-150 pointer-events-auto",
          )}
        >
          <SidebarContent
            user={user}
            guestRemaining={guestRemaining}
            chats={chats}
            activeChatId={activeChatId}
            onDelete={handleDelete}
            onCollapse={() => setCollapsed(true)}
          />
        </div>
      </aside>

      {/* Mobile sidebar */}
      <Sheet>
        <Tooltip>
          <TooltipTrigger asChild>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden fixed top-3 left-3 z-40 bg-background/95 backdrop-blur-sm shadow-md border border-border/50 hover:bg-accent"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">Open menu</TooltipContent>
        </Tooltip>
        <SheetContent side="left" className="w-[280px] p-0">
          <SidebarContent
            user={user}
            guestRemaining={guestRemaining}
            chats={chats}
            activeChatId={activeChatId}
            onDelete={handleDelete}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
