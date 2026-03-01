"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sun,
  Moon,
  Monitor,
  PanelLeftClose,
  PanelLeft,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SearchDialog } from "@/components/search-dialog";

const themes = ["light", "dark", "system"] as const;
type Theme = (typeof themes)[number];

function ThemeIcon({ theme }: { theme: Theme }) {
  switch (theme) {
    case "light":
      return <Sun className="h-5 w-5" />;
    case "dark":
      return <Moon className="h-5 w-5" />;
    case "system":
      return <Monitor className="h-5 w-5" />;
  }
}

const buttonBaseClass = "h-9 w-9 shrink-0 rounded-none hover:bg-accent";

interface TopRightActionsProps {
  user: { name?: string | null; email?: string | null } | null;
  sidebarCollapsed: boolean;
  onSidebarCollapseToggle: () => void;
}

export function TopRightActions({
  user,
  sidebarCollapsed,
  onSidebarCollapseToggle,
}: TopRightActionsProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [rightOffset, setRightOffset] = useState(0);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    let observer: ResizeObserver | null = null;
    let scrollElement: HTMLElement | null = null;

    const checkScrollbar = () => {
      const currentScrollElement = document.querySelector(
        "main .overflow-y-auto",
      ) as HTMLElement | null;

      if (currentScrollElement !== scrollElement) {
        if (scrollElement && observer) observer.unobserve(scrollElement);
        scrollElement = currentScrollElement;
        if (scrollElement && observer) observer.observe(scrollElement);
      }

      let offset = 0;
      if (scrollElement) {
        const hasScrollbar =
          scrollElement.scrollHeight > scrollElement.clientHeight;
        const scrollbarWidth =
          scrollElement.offsetWidth - scrollElement.clientWidth;
        if (hasScrollbar && scrollbarWidth > 0) {
          offset = scrollbarWidth;
        }
      } else {
        const hasScrollbar =
          window.innerWidth > document.documentElement.clientWidth;
        if (hasScrollbar) {
          offset = window.innerWidth - document.documentElement.clientWidth;
        }
      }
      setRightOffset(offset);
    };

    observer = new ResizeObserver(checkScrollbar);
    observer.observe(document.body);
    observer.observe(document.documentElement);

    const mutationObserver = new MutationObserver(checkScrollbar);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    checkScrollbar();
    window.addEventListener("resize", checkScrollbar);

    return () => {
      window.removeEventListener("resize", checkScrollbar);
      observer?.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  const current = (theme ?? "system") as Theme;
  const nextIndex = (themes.indexOf(current) + 1) % themes.length;
  const nextTheme = themes[nextIndex];

  useHotkeys("alt+/, alt+slash", () => setSearchOpen(true), {
    enableOnFormTags: [],
    preventDefault: true,
  });
  useHotkeys(
    "alt+t",
    () => {
      setTheme(nextTheme);
      toast.success(
        `Theme set to ${nextTheme.charAt(0).toUpperCase() + nextTheme.slice(1)}`,
      );
    },
    { enableOnFormTags: [] },
    [nextTheme],
  );
  useHotkeys("alt+b", onSidebarCollapseToggle, { enableOnFormTags: [] });

  return (
    <div
      className="fixed top-3 right-0 z-40 flex flex-col rounded-l-md border border-r-0 border-border/50 bg-card transition-[right] duration-200"
      style={{ right: `${rightOffset}px` }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={buttonBaseClass}
            onClick={() => setSearchOpen(true)}
            aria-label="Search chats"
          >
            <Search className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">Search chats (Alt+/)</TooltipContent>
      </Tooltip>
      <div className="h-px w-full shrink-0 bg-border" />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={buttonBaseClass}
            onClick={() => {
              setTheme(nextTheme);
              toast.success(
                `Theme set to ${nextTheme.charAt(0).toUpperCase() + nextTheme.slice(1)}`,
              );
            }}
            aria-label={`Switch to ${nextTheme} theme`}
          >
            {mounted ? (
              <ThemeIcon theme={current} />
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          Switch to {nextTheme} theme (Alt+T)
        </TooltipContent>
      </Tooltip>
      <div className="hidden h-px w-full shrink-0 bg-border md:block" />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(buttonBaseClass, "hidden md:inline-flex")}
            onClick={onSidebarCollapseToggle}
            aria-label={
              sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
            }
          >
            {sidebarCollapsed ? (
              <PanelLeft className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          {sidebarCollapsed
            ? "Expand sidebar (Alt+B)"
            : "Collapse sidebar (Alt+B)"}
        </TooltipContent>
      </Tooltip>
      <SearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        user={user}
      />
    </div>
  );
}
