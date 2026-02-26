"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NewChatDialog } from "@/components/new-chat-dialog";
import { UserMenu } from "@/components/user-menu";
import { useAppearance } from "@/components/appearance-provider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Trash2,
  Menu,
  Globe,
  PanelLeftClose,
  PanelLeft,
  Plus,
  MoreVertical,
  Pencil,
} from "lucide-react";

const STORAGE_KEY_PREFIX = "chat-order-";
const MAX_CHAT_TITLE_LENGTH = 28;

function truncateTitle(title: string, maxLen: number = MAX_CHAT_TITLE_LENGTH): string {
  const t = title.trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen).trim() + "...";
}

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

function getStoredOrder(identityKey: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + identityKey);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveOrder(identityKey: string, orderedIds: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY_PREFIX + identityKey,
      JSON.stringify(orderedIds),
    );
  } catch {
    // ignore
  }
}

function applyOrder(chats: ChatItem[], orderedIds: string[]): ChatItem[] {
  if (orderedIds.length === 0) return chats;
  const byId = new Map(chats.map((c) => [c.id, c]));
  const result: ChatItem[] = [];
  for (const id of orderedIds) {
    const chat = byId.get(id);
    if (chat) {
      result.push(chat);
      byId.delete(id);
    }
  }
  for (const chat of byId.values()) {
    result.push(chat);
  }
  return result;
}

function SortableChatItem({
  chat,
  isActive,
  compact,
  onDelete,
  onRename,
  onNavigate,
}: {
  chat: ChatItem;
  isActive: boolean;
  compact: boolean;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onNavigate: (id: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editValue, setEditValue] = useState(chat.title || "New Chat");
  const [pendingRename, setPendingRename] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const renameOnCloseRef = useRef(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chat.id });

  const startEditing = useCallback(() => {
    setEditValue((chat.title || "New Chat").slice(0, MAX_CHAT_TITLE_LENGTH));
    setIsEditing(true);
    setPendingRename(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    });
  }, [chat.title]);

  const saveRename = useCallback(() => {
    const trimmed = (editValue.trim() || "New Chat").slice(0, MAX_CHAT_TITLE_LENGTH);
    if (trimmed !== (chat.title || "New Chat")) {
      onRename(chat.id, trimmed);
    }
    setIsEditing(false);
  }, [chat.id, chat.title, editValue, onRename]);

  const cancelEdit = useCallback(() => {
    setEditValue(chat.title || "New Chat");
    setIsEditing(false);
  }, [chat.title]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 rounded-lg text-sm cursor-grab active:cursor-grabbing hover:bg-accent transition-colors min-w-0 overflow-hidden",
        compact ? "px-2 py-0.5" : "px-3 py-1",
        isActive && "bg-accent",
        isDragging && "opacity-50 shadow-md z-50",
      )}
      onClick={() => !isEditing && onNavigate(chat.id)}
      {...attributes}
      {...listeners}
    >
      {isEditing ? (
        <Input
          ref={inputRef}
          value={editValue}
          maxLength={MAX_CHAT_TITLE_LENGTH}
          onChange={(e) => setEditValue(e.target.value.slice(0, MAX_CHAT_TITLE_LENGTH))}
          onBlur={saveRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveRename();
            if (e.key === "Escape") cancelEdit();
            e.stopPropagation();
          }}
          onClick={(e) => e.stopPropagation()}
          className="h-7 flex-1 min-w-0 text-sm"
        />
      ) : (
        <span
          className="flex-1 min-w-0 truncate"
          title={chat.title || "New Chat"}
          onDoubleClick={(e) => {
            e.stopPropagation();
            startEditing();
          }}
        >
          {truncateTitle(chat.title || "New Chat")}
        </span>
      )}
      <DropdownMenu
        onOpenChange={(open) => {
          if (!open && pendingRename) {
            setPendingRename(false);
            startEditing();
          }
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-6 w-6 shrink-0",
              isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100",
            )}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          side="bottom"
          onCloseAutoFocus={(e) => {
            if (renameOnCloseRef.current) {
              renameOnCloseRef.current = false;
              e.preventDefault();
            }
          }}
        >
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              renameOnCloseRef.current = true;
              setPendingRename(true);
            }}
          >
            <Pencil />
            Rename chat
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              setDeleteConfirmOpen(true);
            }}
          >
            <Trash2 />
            Delete chat
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete chat?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this chat? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onDelete(chat.id);
                setDeleteConfirmOpen(false);
              }}
            >
              Yes, delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SidebarContent({
  user,
  guestRemaining,
  chats,
  activeChatId,
  onDelete,
  onRename,
  onCollapse,
  onReorder,
  identityKey,
}: ChatSidebarProps & {
  chats: ChatItem[];
  activeChatId: string | null;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onCollapse?: () => void;
  onReorder?: (orderedIds: string[]) => void;
  identityKey: string | null;
}) {
  const router = useRouter();
  const { compact } = useAppearance();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorder) return;
    const oldIndex = chats.findIndex((c) => c.id === active.id);
    const newIndex = chats.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(chats, oldIndex, newIndex);
    onReorder(reordered.map((c) => c.id));
  };

  const chatIds = useMemo(() => chats.map((c) => c.id), [chats]);

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
      <ScrollArea className="flex-1 min-w-0">
        <div
          className={cn(
            "space-y-1 min-w-0",
            compact ? "p-1" : "p-2",
          )}
        >
          {chats.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <SortableContext
                items={chatIds}
                strategy={verticalListSortingStrategy}
              >
                {chats.map((chat) => (
                  <SortableChatItem
                    key={chat.id}
                    chat={chat}
                    isActive={activeChatId === chat.id}
                    compact={compact}
                    onDelete={onDelete}
                    onRename={onRename}
                    onNavigate={(id) => router.push(`/chat/${id}`)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          ) : null}
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
  const [identityKey, setIdentityKey] = useState<string | null>(null);
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
        const rawChats = data.chats as ChatItem[];
        const key = data.identityKey as string | undefined;
        if (key) setIdentityKey(key);
        const orderedIds = key ? getStoredOrder(key) : [];
        setChats(applyOrder(rawChats, orderedIds));
      }
    } catch {
      // silently fail
    }
  }

  function handleReorder(orderedIds: string[]) {
    setChats((prev) => {
      const byId = new Map(prev.map((c) => [c.id, c]));
      const reordered = orderedIds
        .map((id) => byId.get(id))
        .filter(Boolean) as ChatItem[];
      const appended = prev.filter((c) => !orderedIds.includes(c.id));
      return reordered.length > 0 ? [...reordered, ...appended] : prev;
    });
    if (identityKey) saveOrder(identityKey, orderedIds);
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/chats/${id}`, { method: "DELETE" });
      if (res.ok) {
        setChats((prev) => prev.filter((c) => c.id !== id));
        if (activeChatId === id) {
          router.push("/");
        }
        toast.success("Chat deleted");
      }
    } catch {
      // silently fail
    }
  }

  async function handleRename(id: string, title: string) {
    const oldTitle = chats.find((c) => c.id === id)?.title || "New Chat";
    try {
      const res = await fetch(`/api/chats/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        setChats((prev) =>
          prev.map((c) => (c.id === id ? { ...c, title } : c)),
        );
        toast.success(`Renamed from "${oldTitle}" to "${title}"`);
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
            onRename={handleRename}
            onCollapse={() => setCollapsed(true)}
            onReorder={handleReorder}
            identityKey={identityKey}
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
            onRename={handleRename}
            onReorder={handleReorder}
            identityKey={identityKey}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
