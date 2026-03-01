"use client";

import { useState } from "react";
import { useTimeUntilMidnightUTC } from "@/hooks/use-time-until-midnight-utc";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AuthDialog } from "@/components/auth-dialog";
import { ProfileSettingsDialog } from "@/components/profile-settings-dialog";
import { Archive, LogOut, Settings, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  user: { name?: string | null; email?: string | null } | null;
  guestRemaining?: number;
  collapsed?: boolean;
  initialLoading?: boolean;
  settingsOpen?: boolean;
  onSettingsOpenChange?: (open: boolean) => void;
  authOpen?: boolean;
  onAuthOpenChange?: (open: boolean) => void;
  authTab?: "login" | "register";
  onOpenAuth?: (tab: "login" | "register") => void;
}

export function UserMenu({
  user,
  guestRemaining,
  collapsed,
  initialLoading = false,
  settingsOpen: controlledSettingsOpen,
  onSettingsOpenChange: controlledOnSettingsOpenChange,
  authOpen: controlledAuthOpen,
  onAuthOpenChange: controlledOnAuthOpenChange,
  authTab: controlledAuthTab,
  onOpenAuth: controlledOnOpenAuth,
}: UserMenuProps) {
  const timeUntilReset = useTimeUntilMidnightUTC();
  const [internalAuthOpen, setInternalAuthOpen] = useState(false);
  const [internalAuthTab, setInternalAuthTab] = useState<"login" | "register">("login");
  const isAuthControlled =
    controlledAuthOpen !== undefined && controlledOnAuthOpenChange !== undefined;
  const authOpen = isAuthControlled ? controlledAuthOpen! : internalAuthOpen;
  const setAuthOpen = isAuthControlled ? controlledOnAuthOpenChange! : setInternalAuthOpen;
  const authTab = controlledAuthTab ?? internalAuthTab;
  const [internalSettingsOpen, setInternalSettingsOpen] = useState(false);

  const isSettingsControlled =
    controlledSettingsOpen !== undefined &&
    controlledOnSettingsOpenChange !== undefined;
  const settingsOpen = isSettingsControlled
    ? controlledSettingsOpen
    : internalSettingsOpen;
  const setSettingsOpen = isSettingsControlled
    ? controlledOnSettingsOpenChange!
    : setInternalSettingsOpen;

  if (initialLoading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 min-w-0",
          collapsed ? "justify-center" : "px-2",
        )}
      >
        <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
        {!collapsed && <Skeleton className="h-4 flex-1 min-w-0 rounded" />}
      </div>
    );
  }

  if (user) {
    const initials = (user.name || user.email || "U")
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    return (
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              {collapsed ? (
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                </Button>
              ) : (
            <Button variant="ghost" className="w-full justify-start gap-2 px-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <span className="truncate text-sm">
                {user.name || user.email}
              </span>
            </Button>
          )}
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">Account menu</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem asChild>
            <Link href="/archive">
              <Archive className="h-4 w-4 mr-2" />
              Archived Chats
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
            <DropdownMenuShortcut>Alt+,</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={async () => {
              const { signOut } = await import("next-auth/react");
              await signOut({ redirectTo: "/" });
            }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
        {!isSettingsControlled && (
          <ProfileSettingsDialog
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            user={user}
          />
        )}
      </DropdownMenu>
    );
  }

  function openAuth(tab: "login" | "register") {
    if (controlledOnOpenAuth) {
      controlledOnOpenAuth(tab);
    } else {
      setInternalAuthTab(tab);
      setAuthOpen(true);
    }
  }

  if (collapsed) {
    return (
      <>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => openAuth("login")}
            >
              <UserIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Login or register</TooltipContent>
        </Tooltip>
        <AuthDialog
          open={authOpen}
          onOpenChange={setAuthOpen}
          defaultTab={authTab}
        />
      </>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {guestRemaining !== undefined && (
          <p className="text-xs text-muted-foreground px-2">
            {guestRemaining}/3 chats remaining today
            {timeUntilReset && (
              <span className="ml-1">· {timeUntilReset}</span>
            )}
          </p>
        )}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => openAuth("login")}
          >
            <UserIcon className="h-3.5 w-3.5 mr-1.5" />
            Login
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={() => openAuth("register")}
          >
            Register
          </Button>
        </div>
      </div>
      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        defaultTab={authTab}
      />
    </>
  );
}
