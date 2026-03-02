"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NewChatDialog } from "@/components/new-chat-dialog";
import { ProfileSettingsDialog } from "@/components/profile-settings-dialog";
import { UserMenu } from "@/components/user-menu";
import { useAppearance } from "@/components/appearance-provider";
import { useNavigationLoading } from "@/components/navigation-loading-context";
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
  Archive,
  Trash2,
  Menu,
  Plus,
  MoreVertical,
  Pencil,
  Pin,
  PinOff,
  Link2,
} from "lucide-react";

const STORAGE_KEY_PREFIX = "chat-order-";
const MAX_CHAT_TITLE_LENGTH = 28;

function truncateTitle(
  title: string,
  maxLen: number = MAX_CHAT_TITLE_LENGTH,
): string {
  const t = title.trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen).trim() + "...";
}

interface ChatItem {
  id: string;
  title: string | null;
  createdAt: string;
  pinnedAt: string | null;
  pages: { url: string; title: string | null }[];
}

interface ChatSidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
  guestRemaining?: number;
  collapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
  authOpen?: boolean;
  onAuthOpenChange?: (open: boolean) => void;
  authTab?: "login" | "register";
  onOpenAuth?: (tab: "login" | "register") => void;
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
  const pinned = chats.filter((c) => c.pinnedAt);
  const unpinned = chats.filter((c) => !c.pinnedAt);
  if (orderedIds.length === 0) return chats;
  const pinnedById = new Map(pinned.map((c) => [c.id, c]));
  const unpinnedById = new Map(unpinned.map((c) => [c.id, c]));
  const orderedPinned: ChatItem[] = [];
  const orderedUnpinned: ChatItem[] = [];
  for (const id of orderedIds) {
    const p = pinnedById.get(id);
    if (p) {
      orderedPinned.push(p);
      pinnedById.delete(id);
    } else {
      const u = unpinnedById.get(id);
      if (u) {
        orderedUnpinned.push(u);
        unpinnedById.delete(id);
      }
    }
  }
  for (const chat of pinnedById.values()) orderedPinned.push(chat);
  const remainingUnpinned = [...unpinnedById.values()];
  return [...orderedPinned, ...orderedUnpinned, ...remainingUnpinned];
}

function SortableChatItem({
  chat,
  isActive,
  compact,
  canPin,
  menuOpen,
  onMenuOpenChange,
  onDelete,
  onRename,
  onPin,
  onArchive,
  onNavigate,
  isGuest,
}: {
  chat: ChatItem;
  isActive: boolean;
  compact: boolean;
  canPin: boolean;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  onArchive: (id: string) => void;
  onNavigate: (id: string) => void;
  isGuest?: boolean;
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
    const trimmed = (editValue.trim() || "New Chat").slice(
      0,
      MAX_CHAT_TITLE_LENGTH,
    );
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
          onChange={(e) =>
            setEditValue(e.target.value.slice(0, MAX_CHAT_TITLE_LENGTH))
          }
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
        <>
          {chat.pinnedAt && (
            <Pin className="h-3 w-3 shrink-0 text-muted-foreground" />
          )}
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
        </>
      )}
      <DropdownMenu
        open={menuOpen}
        onOpenChange={(open) => {
          onMenuOpenChange(open);
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
              onPin(chat.id, !chat.pinnedAt);
            }}
            disabled={!chat.pinnedAt && !canPin}
          >
            {chat.pinnedAt ? (
              <>
                <PinOff />
                Unpin chat
              </>
            ) : (
              <>
                <Pin />
                Pin chat
              </>
            )}
          </DropdownMenuItem>
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
          {!isGuest && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onArchive(chat.id);
              }}
            >
              <Archive />
              Archive chat
            </DropdownMenuItem>
          )}
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

const CHATS_PAGE_SIZE = 30;

function SidebarContent({
  user,
  guestRemaining,
  chats,
  activeChatId,
  onDelete,
  onRename,
  onPin,
  onArchive,
  onReorder,
  onChatCreated,
  identityKey,
  openMenuChatId,
  onOpenMenuChatIdChange,
  scrollAreaRef,
  sentinelRef,
  hasMore,
  loadingMore,
  onLoadMore,
  initialLoading = false,
  newChatOpen,
  onNewChatOpenChange,
  settingsOpen,
  onSettingsOpenChange,
  authOpen,
  onAuthOpenChange,
  authTab,
  onOpenAuth,
  onOpenRegister,
}: ChatSidebarProps & {
  chats: ChatItem[];
  activeChatId: string | null;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  onArchive: (id: string) => void;
  onReorder?: (orderedIds: string[]) => void;
  onChatCreated?: () => void;
  identityKey: string | null;
  openMenuChatId: string | null;
  onOpenMenuChatIdChange: (id: string | null) => void;
  scrollAreaRef: React.RefObject<HTMLDivElement | null>;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore?: () => void;
  initialLoading?: boolean;
  newChatOpen: boolean;
  onNewChatOpenChange: (open: boolean) => void;
  settingsOpen?: boolean;
  onSettingsOpenChange?: (open: boolean) => void;
  authOpen?: boolean;
  onAuthOpenChange?: (open: boolean) => void;
  authTab?: "login" | "register";
  onOpenAuth?: (tab: "login" | "register") => void;
  onOpenRegister?: () => void;
}) {
  const router = useRouter();
  const { compact } = useAppearance();
  const navLoading = useNavigationLoading();

  const handleNavigateToChat = useCallback(
    (id: string) => {
      if (navLoading?.navigateToChat) {
        navLoading.navigateToChat(id);
      } else {
        router.push(`/chat/${id}`);
      }
    },
    [navLoading, router],
  );

  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    const sentinel = sentinelRef.current;
    if (!scrollArea || !sentinel || !hasMore || loadingMore || !onLoadMore)
      return;
    const viewport = scrollArea.querySelector(
      "[data-slot=scroll-area-viewport]",
    );
    if (!viewport) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingMore) onLoadMore();
      },
      { root: viewport, rootMargin: "100px", threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [scrollAreaRef, sentinelRef, hasMore, loadingMore, onLoadMore]);

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
      <div className={cn("flex items-center gap-4", compact ? "p-2" : "p-3")}>
        <Button size="icon" className="h-9 w-9 shrink-0" asChild>
          <Link href="/" aria-label="Go to home">
            <span className="text-sm font-semibold">E</span>
          </Link>
        </Button>
        <div className="flex-1">
          <NewChatDialog
            guestRemaining={guestRemaining}
            onChatCreated={onChatCreated}
            onOpenRegister={onOpenRegister}
            open={newChatOpen}
            onOpenChange={onNewChatOpenChange}
          />
        </div>
      </div>
      <Separator />
      <div
        ref={scrollAreaRef}
        className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden"
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
              {(() => {
                const pinnedChats = chats.filter((c) => c.pinnedAt);
                const unpinnedChats = chats.filter((c) => !c.pinnedAt);
                const pinnedCount = pinnedChats.length;
                const maxPinned = user ? 5 : 1;
                return (
                  <>
                    {pinnedChats.length > 0 && (
                      <div
                        className={cn(
                          "shrink-0 border-b border-border/50 bg-card",
                          compact ? "p-1" : "p-2 pb-1",
                        )}
                      >
                        <div
                          className={cn(
                            "space-y-1",
                            compact ? "space-y-0.5" : "",
                          )}
                        >
                          {pinnedChats.map((chat) => (
                            <SortableChatItem
                              key={chat.id}
                              chat={chat}
                              isActive={activeChatId === chat.id}
                              compact={compact}
                              canPin={true}
                              menuOpen={openMenuChatId === chat.id}
                              onMenuOpenChange={(open) =>
                                onOpenMenuChatIdChange(open ? chat.id : null)
                              }
                              onDelete={onDelete}
                              onRename={onRename}
                              onPin={onPin}
                              onArchive={onArchive}
                              onNavigate={handleNavigateToChat}
                              isGuest={!user}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    <ScrollArea className="flex-1 min-h-0">
                      <div
                        className={cn(
                          "space-y-1 min-w-0",
                          compact ? "p-1" : "p-2",
                        )}
                      >
                        {unpinnedChats.map((chat) => {
                          const canPin =
                            !!chat.pinnedAt || pinnedCount < maxPinned;
                          return (
                            <SortableChatItem
                              key={chat.id}
                              chat={chat}
                              isActive={activeChatId === chat.id}
                              compact={compact}
                              canPin={canPin}
                              menuOpen={openMenuChatId === chat.id}
                              onMenuOpenChange={(open) =>
                                onOpenMenuChatIdChange(open ? chat.id : null)
                              }
                              onDelete={onDelete}
                              onRename={onRename}
                              onPin={onPin}
                              onArchive={onArchive}
                              onNavigate={handleNavigateToChat}
                              isGuest={!user}
                            />
                          );
                        })}
                        {loadingMore &&
                          Array.from({ length: 6 }).map((_, i) => (
                            <div
                              key={`skeleton-${i}`}
                              className={cn(
                                "flex items-center gap-2 rounded-lg min-w-0",
                                compact ? "px-2 py-0.5" : "px-3 py-1",
                              )}
                            >
                              <Skeleton className="h-4 flex-1 min-w-0 rounded" />
                            </div>
                          ))}
                        {chats.length > 0 && hasMore && (
                          <div ref={sentinelRef} className="h-4 shrink-0" />
                        )}
                      </div>
                    </ScrollArea>
                  </>
                );
              })()}
            </SortableContext>
          </DndContext>
        ) : (
          <ScrollArea className="flex-1 min-h-0">
            <div className={cn("space-y-1 min-w-0", compact ? "p-1" : "p-2")}>
              {(initialLoading || loadingMore) &&
                Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={`skeleton-${i}`}
                    className={cn(
                      "flex items-center gap-2 rounded-lg min-w-0",
                      compact ? "px-2 py-0.5" : "px-3 py-1",
                    )}
                  >
                    <Skeleton className="h-4 flex-1 min-w-0 rounded" />
                  </div>
                ))}
              {chats.length === 0 && !initialLoading && (
                <div className="flex flex-col items-left justify-left py-10 px-4">
                  <p className="text-sm font-medium text-foreground">
                    No chats yet
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 text-left max-w-[200px]">
                    Click on{" "}
                    <span className="mx-1.5 inline-flex h-6 items-center gap-2 rounded-sm bg-primary px-2 text-xs font-medium text-primary-foreground [&_svg]:size-3">
                      <Plus className="h-4 w-4" />
                      New Chat
                    </span>{" "}
                    above and paste a URL to crawl and chat with AI about any
                    webpage
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>
      <Separator />
      <div className={compact ? "p-2" : "p-3"}>
        <UserMenu
          user={user}
          guestRemaining={guestRemaining}
          initialLoading={initialLoading}
          settingsOpen={settingsOpen}
          onSettingsOpenChange={onSettingsOpenChange}
          authOpen={authOpen}
          onAuthOpenChange={onAuthOpenChange}
          authTab={authTab}
          onOpenAuth={onOpenAuth}
        />
      </div>
    </div>
  );
}

export function ChatSidebar({
  user,
  guestRemaining,
  collapsed = false,
  onCollapseChange,
  authOpen: controlledAuthOpen,
  onAuthOpenChange: controlledOnAuthOpenChange,
  authTab: controlledAuthTab,
  onOpenAuth: controlledOnOpenAuth,
}: ChatSidebarProps) {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [identityKey, setIdentityKey] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [openMenuChatId, setOpenMenuChatId] = useState<string | null>(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [internalAuthOpen, setInternalAuthOpen] = useState(false);
  const [internalAuthTab, setInternalAuthTab] = useState<"login" | "register">(
    "login",
  );

  const isAuthControlled =
    controlledAuthOpen !== undefined &&
    controlledOnAuthOpenChange !== undefined;
  const authOpen = isAuthControlled ? controlledAuthOpen! : internalAuthOpen;
  const setAuthOpen = isAuthControlled
    ? controlledOnAuthOpenChange!
    : setInternalAuthOpen;
  const authTab = controlledAuthTab ?? internalAuthTab;
  const internalOpenAuth = useCallback((tab: "login" | "register") => {
    setInternalAuthTab(tab);
    setInternalAuthOpen(true);
  }, []);
  const openAuth = controlledOnOpenAuth ?? internalOpenAuth;

  useHotkeys("alt+n", () => setNewChatOpen(true), { enableOnFormTags: [] });
  useHotkeys(
    "alt+comma",
    () => setSettingsOpen(true),
    {
      enableOnFormTags: [],
      enabled: !!user,
      preventDefault: true,
    },
    [user],
  );
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const chatsLengthRef = useRef(0);
  chatsLengthRef.current = chats.length;
  const pathname = usePathname();
  const router = useRouter();
  const navLoading = useNavigationLoading();

  const handleNavigateToChat = useCallback(
    (id: string) => {
      if (navLoading?.navigateToChat) {
        navLoading.navigateToChat(id);
      } else {
        router.push(`/chat/${id}`);
      }
    },
    [navLoading, router],
  );

  const activeChatId = pathname.startsWith("/chat/")
    ? pathname.split("/")[2]
    : null;

  const fetchChats = useCallback(async (append: boolean) => {
    if (!append) setInitialLoading(true);
    try {
      const skip = append ? chatsLengthRef.current : 0;
      const res = await fetch(
        `/api/chats?limit=${CHATS_PAGE_SIZE}&skip=${skip}`,
      );
      if (res.ok) {
        const data = await res.json();
        const rawChats = data.chats as ChatItem[];
        const key = data.identityKey as string | undefined;
        const more = data.hasMore as boolean;
        if (key) setIdentityKey(key);
        const orderedIds = key ? getStoredOrder(key) : [];
        const ordered = applyOrder(rawChats, orderedIds);
        setChats((prev) => (append ? [...prev, ...ordered] : ordered));
        setHasMore(more);
      }
    } catch {
      // silently fail
    } finally {
      if (!append) setInitialLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchChats(false);
  }, [user?.email, fetchChats]);

  const prevPathRef = useRef(pathname);
  useEffect(() => {
    if (
      prevPathRef.current.startsWith("/archive") &&
      !pathname.startsWith("/archive")
    ) {
      fetchChats(false);
    }
    prevPathRef.current = pathname;
  }, [pathname, fetchChats]);

  useEffect(() => {
    const handler = () => fetchChats(false);
    window.addEventListener("chat-restored", handler);
    return () => window.removeEventListener("chat-restored", handler);
  }, [fetchChats]);

  const identityKeyRef = useRef(identityKey);
  const chatsRef = useRef(chats);
  identityKeyRef.current = identityKey;
  chatsRef.current = chats;

  useEffect(() => {
    const handler = (e: Event) => {
      const { chatId } = (e as CustomEvent<{ chatId: string }>).detail ?? {};
      const key = identityKeyRef.current;
      const chatList = chatsRef.current;
      if (!chatId || !key) return;
      const pinnedIds = new Set(
        chatList.filter((c) => c.pinnedAt).map((c) => c.id),
      );
      if (pinnedIds.has(chatId)) return;
      const orderedIds = getStoredOrder(key);
      const without = orderedIds.filter((id) => id !== chatId);
      let insertIndex = without.length;
      for (let i = 0; i < without.length; i++) {
        if (!pinnedIds.has(without[i])) {
          insertIndex = i;
          break;
        }
      }
      const newOrderedIds = [
        ...without.slice(0, insertIndex),
        chatId,
        ...without.slice(insertIndex),
      ];
      saveOrder(key, newOrderedIds);
      setChats((prev) => applyOrder(prev, newOrderedIds));
    };
    window.addEventListener(
      "echologue:chat-message-sent",
      handler as EventListener,
    );
    return () =>
      window.removeEventListener(
        "echologue:chat-message-sent",
        handler as EventListener,
      );
  }, []);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetchChats(true);
  }, [loadingMore, hasMore, fetchChats]);

  function handleReorder(orderedIds: string[]) {
    const pinnedIds = new Set(chats.filter((c) => c.pinnedAt).map((c) => c.id));
    const orderedPinned = orderedIds.filter((id) => pinnedIds.has(id));
    const orderedUnpinned = orderedIds.filter((id) => !pinnedIds.has(id));
    const sanitizedIds = [...orderedPinned, ...orderedUnpinned];

    setChats((prev) => {
      const byId = new Map(prev.map((c) => [c.id, c]));
      const reordered = sanitizedIds
        .map((id) => byId.get(id))
        .filter(Boolean) as ChatItem[];
      const appended = prev.filter((c) => !orderedIds.includes(c.id));
      return reordered.length > 0 ? [...reordered, ...appended] : prev;
    });
    if (identityKey) saveOrder(identityKey, sanitizedIds);
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

  async function handleArchive(id: string) {
    try {
      const res = await fetch(`/api/chats/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: true }),
      });
      if (res.ok) {
        setChats((prev) => prev.filter((c) => c.id !== id));
        if (identityKey) {
          const orderedIds = getStoredOrder(identityKey).filter(
            (cid) => cid !== id,
          );
          saveOrder(identityKey, orderedIds);
        }
        if (activeChatId === id) {
          router.push("/");
        }
        toast.success("Chat archived");
      }
    } catch {
      toast.error("Failed to archive chat");
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

  function sortChatsWithPinnedFirst(chats: ChatItem[]): ChatItem[] {
    const pinned = chats.filter((c) => c.pinnedAt);
    const unpinned = chats.filter((c) => !c.pinnedAt);
    pinned.sort((a, b) => {
      const aT = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
      const bT = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
      return aT - bT;
    });
    return [...pinned, ...unpinned];
  }

  async function handlePin(id: string, pinned: boolean) {
    try {
      const res = await fetch(`/api/chats/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned }),
      });
      if (res.ok) {
        const updated = chats.map((c) =>
          c.id === id
            ? { ...c, pinnedAt: pinned ? new Date().toISOString() : null }
            : c,
        );
        const sorted = sortChatsWithPinnedFirst(updated);
        if (identityKey)
          saveOrder(
            identityKey,
            sorted.map((c) => c.id),
          );
        setChats(sorted);
        await fetchChats(false);
        toast.success(pinned ? "Chat pinned" : "Chat unpinned");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update pin");
      }
    } catch {
      toast.error("Failed to update pin");
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
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <Link href="/" aria-label="Go to home">
                  <span className="text-xs font-semibold">E</span>
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Go to home</TooltipContent>
          </Tooltip>
          <NewChatDialog
            guestRemaining={guestRemaining}
            onOpenRegister={() => openAuth("register")}
            open={newChatOpen}
            onOpenChange={setNewChatOpen}
          >
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Plus className="h-4 w-4" />
            </Button>
          </NewChatDialog>
          {collapsed &&
            (() => {
              const pinnedChats = chats.filter((c) => c.pinnedAt);
              return pinnedChats.length > 0 ? (
                <ScrollArea className="flex-1 min-h-0 w-full px-1">
                  <div className="flex flex-col items-center gap-1 py-2">
                    {pinnedChats.map((chat) => (
                      <Tooltip key={chat.id}>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-8 w-8 shrink-0",
                              activeChatId === chat.id && "bg-accent",
                            )}
                            onClick={() => handleNavigateToChat(chat.id)}
                          >
                            <Pin className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          {chat.title || "New Chat"}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </ScrollArea>
              ) : null;
            })()}
          <div className="mt-auto shrink-0">
            <UserMenu
              user={user}
              guestRemaining={guestRemaining}
              collapsed
              initialLoading={initialLoading}
              settingsOpen={settingsOpen}
              onSettingsOpenChange={setSettingsOpen}
              authOpen={authOpen}
              onAuthOpenChange={setAuthOpen}
              authTab={authTab}
              onOpenAuth={openAuth}
            />
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
            onPin={handlePin}
            onArchive={handleArchive}
            onReorder={handleReorder}
            onChatCreated={() => fetchChats(false)}
            identityKey={identityKey}
            openMenuChatId={openMenuChatId}
            onOpenMenuChatIdChange={setOpenMenuChatId}
            scrollAreaRef={scrollAreaRef}
            sentinelRef={sentinelRef}
            hasMore={hasMore}
            loadingMore={loadingMore}
            onLoadMore={loadMore}
            initialLoading={initialLoading}
            newChatOpen={newChatOpen}
            onNewChatOpenChange={setNewChatOpen}
            settingsOpen={settingsOpen}
            onSettingsOpenChange={setSettingsOpen}
            authOpen={authOpen}
            onAuthOpenChange={setAuthOpen}
            authTab={authTab}
            onOpenAuth={openAuth}
            onOpenRegister={() => openAuth("register")}
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
                className="md:hidden fixed top-3 left-0 z-40 h-9 w-9 rounded-l-none rounded-r-md border border-l-0 border-border/50 bg-card hover:bg-accent shadow-none"
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
            onPin={handlePin}
            onArchive={handleArchive}
            onReorder={handleReorder}
            onChatCreated={() => fetchChats(false)}
            identityKey={identityKey}
            openMenuChatId={openMenuChatId}
            onOpenMenuChatIdChange={setOpenMenuChatId}
            scrollAreaRef={scrollAreaRef}
            sentinelRef={sentinelRef}
            hasMore={hasMore}
            loadingMore={loadingMore}
            onLoadMore={loadMore}
            initialLoading={initialLoading}
            newChatOpen={newChatOpen}
            onNewChatOpenChange={setNewChatOpen}
            settingsOpen={settingsOpen}
            onSettingsOpenChange={setSettingsOpen}
            authOpen={authOpen}
            onAuthOpenChange={setAuthOpen}
            authTab={authTab}
            onOpenAuth={openAuth}
            onOpenRegister={() => openAuth("register")}
          />
        </SheetContent>
      </Sheet>
      {user && (
        <ProfileSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          user={user}
        />
      )}
    </>
  );
}
